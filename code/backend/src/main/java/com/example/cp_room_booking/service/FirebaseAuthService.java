package com.example.cp_room_booking.service;

import com.example.cp_room_booking.domain.entity.Account;
import com.example.cp_room_booking.domain.enums.Role;
import com.example.cp_room_booking.repository.AccountRepository;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class FirebaseAuthService {

    private static final Logger LOGGER = LoggerFactory.getLogger(FirebaseAuthService.class);
    private static final Pattern AUDIENCE_CLAIM = Pattern.compile("\"aud\"\\s*:\\s*\"([^\"]*)\"");
    private static final Pattern ISSUER_CLAIM = Pattern.compile("\"iss\"\\s*:\\s*\"([^\"]*)\"");

    private final AccountRepository accountRepository;
    private final String projectId;
    private final String clientEmail;
    private final String privateKey;
    private final Set<String> adminEmails;

    public FirebaseAuthService(
            AccountRepository accountRepository,
            @Value("${firebase.project-id:}") String projectId,
            @Value("${firebase.client-email:}") String clientEmail,
            @Value("${firebase.private-key:}") String privateKey,
            @Value("${app.admin-emails:}") String adminEmails) {
        this.accountRepository = accountRepository;
        this.projectId = projectId;
        this.clientEmail = clientEmail;
        this.privateKey = privateKey;
        this.adminEmails = Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .filter(email -> !email.isEmpty())
                .map(email -> email.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    public Account getOrCreateAccount(String authorizationHeader) {
        FirebaseToken token = verifyToken(authorizationHeader);
        String email = token.getEmail();
        String uid = token.getUid();
        if (email == null || email.isBlank() || !Boolean.TRUE.equals(token.getClaims().get("email_verified"))) {
            LOGGER.warn("Firebase token was valid but did not contain a verified email");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "A verified Firebase email is required");
        }

        Account account = accountRepository.findByUsername(uid)
                .orElseGet(() -> accountRepository.findByEmail(email).orElseGet(() ->
                        Account.builder()
                                .username(uid)
                                .fullName(readName(token, email))
                                .email(email)
                                .role(adminEmails.contains(email.toLowerCase(Locale.ROOT)) ? Role.ADMIN : Role.USER)
                                .active(true)
                                .build()));
        account.setUsername(uid);
        account.setFullName(readName(token, email));
        account.setEmail(email);
        if (adminEmails.contains(email.toLowerCase(Locale.ROOT))) {
            account.setRole(Role.ADMIN);
        }
        if (!account.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive");
        }
        return accountRepository.save(account);
    }

    public boolean isConfiguredAdminEmail(String email) {
        return email != null && adminEmails.contains(email.toLowerCase(Locale.ROOT));
    }

    public Account requireAdmin(String authorizationHeader) {
        Account account = getOrCreateAccount(authorizationHeader);
        if (account.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access required");
        }
        return account;
    }

    private FirebaseToken verifyToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            LOGGER.warn("Firebase authentication request did not include a bearer token");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "A Firebase bearer token is required");
        }

        FirebaseApp app;
        try {
            app = getFirebaseApp();
        } catch (IOException | IllegalStateException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Firebase Admin is not configured", exception);
        }
        try {
            String idToken = authorizationHeader.substring("Bearer ".length()).trim();
            try {
                return FirebaseAuth.getInstance(app).verifyIdToken(idToken);
            } catch (Exception exception) {
                logTokenProjectClaims(idToken);
                throw exception;
            }
        } catch (Exception exception) {
            LOGGER.warn("Firebase ID token verification failed: {} - {}",
                    exception.getClass().getSimpleName(), exception.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Firebase token", exception);
        }
    }

    private void logTokenProjectClaims(String idToken) {
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length != 3) {
                LOGGER.warn("Firebase token is not a three-part JWT; backend project ID is '{}'", projectId);
                return;
            }

            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            LOGGER.warn("Firebase token project diagnostics: backend project ID='{}', token audience='{}', token issuer='{}'",
                    projectId, readClaim(payload, AUDIENCE_CLAIM), readClaim(payload, ISSUER_CLAIM));
        } catch (IllegalArgumentException exception) {
            LOGGER.warn("Could not read Firebase token project claims; backend project ID is '{}'", projectId);
        }
    }

    private String readClaim(String payload, Pattern claimPattern) {
        Matcher matcher = claimPattern.matcher(payload);
        return matcher.find() ? matcher.group(1) : "missing";
    }

    private FirebaseApp getFirebaseApp() throws IOException {
        List<FirebaseApp> apps = FirebaseApp.getApps();
        if (!apps.isEmpty()) {
            return apps.get(0);
        }
        if (projectId.isBlank() || clientEmail.isBlank() || privateKey.isBlank()) {
            throw new IllegalStateException("Firebase credentials are not configured");
        }

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(new ByteArrayInputStream(
                        serviceAccountJson().getBytes(StandardCharsets.UTF_8))))
                .setHttpTransport(new NetHttpTransport())
                .setProjectId(projectId)
                .build();
        return FirebaseApp.initializeApp(options);
    }

    private String serviceAccountJson() {
        return "{\"type\":\"service_account\",\"project_id\":\"" + escape(projectId)
                + "\",\"private_key_id\":\"unused\",\"private_key\":\""
                + escape(privateKey.replace("\\n", "\n")) + "\",\"client_email\":\""
                + escape(clientEmail) + "\",\"client_id\":\"unused\",\"auth_uri\":\"https://accounts.google.com/o/oauth2/auth\",\"token_uri\":\"https://oauth2.googleapis.com/token\",\"auth_provider_x509_cert_url\":\"https://www.googleapis.com/oauth2/v1/certs\",\"client_x509_cert_url\":\"\"}";
    }

    private String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\r", "\\r").replace("\n", "\\n");
    }

    private String readName(FirebaseToken token, String email) {
        Object name = token.getClaims().get("name");
        return name instanceof String && !((String) name).isBlank() ? (String) name : email;
    }
}
