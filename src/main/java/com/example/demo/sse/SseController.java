package com.example.demo.sse;

import com.example.demo.security.jwtutil.CustomJWTException;
import com.example.demo.security.jwtutil.JWTUtil;
import com.example.demo.staff.Staff;
import com.example.demo.staff.StaffRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequiredArgsConstructor
public class SseController {
    private final SseService sseService;
    private final JWTUtil jWTUtil;
    private final UserRepository userRepository;
    private final StaffRepository staffRepository;

    @GetMapping(value = "/api/sse/subscribe/{userId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable Integer userId,
                                @RequestHeader(value = "Authorization", required = false) String authHeader) {

//        SseEmitter emitter = new SseEmitter(60 * 1000L);

        String accessToken = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }

        System.out.println("accessToken======>"+accessToken);

        try {
            if (accessToken == null || accessToken.isBlank()) {
                SseEmitter err = new SseEmitter();
                try { err.send(SseEmitter.event().name("error").data("NO_TOKEN")); } catch (Exception ignored) {}
                err.complete();
                return err;
            }

            Claims claims=null;
            try {
                claims = jWTUtil.validateToken(accessToken);
                System.out.println("==========>"+claims);
            } catch (CustomJWTException e) {
                if ("Expired".equals(e.getMessage())) {
//                    Map<String, Object> response = sseService.getToken(accessToken, refreshToken);
//                    emitter.send(SseEmitter.event()
//                            .name("TOKEN_REFRESH")
//                            .data(response));
                    SseEmitter err = new SseEmitter();
                    try { err.send(SseEmitter.event().name("error").data("TOKEN_REFRESH")); } catch (Exception ignored) {}
                    err.complete();
                    return err;
                } else {
                    throw e;
                }
            }

            Integer claimUserId = Integer.valueOf(claims.get("userId").toString());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("user Not exist"));
            Staff staff = staffRepository.findByUser(user)
                    .orElseThrow(() -> new RuntimeException("staff Not exist"));

            System.out.println("로그인한 의사===========>"+userId);


            if (!staff.getUser().getUserId().equals(claimUserId)) {
                SseEmitter err = new SseEmitter();
                try { err.send(SseEmitter.event().name("error").data("FORBIDDEN")); } catch (Exception ignored) {}
                err.complete();
                return err;
            }
            System.out.println("SSE 구독 요청 userId = " + userId);

            return sseService.subscribe(userId);

        } catch (CustomJWTException e) {
            SseEmitter err = new SseEmitter();
            try {
                String msg = "Expired".equals(e.getMessage()) ? "TOKEN_REFRESH" : "AUTH_ERROR";
                err.send(SseEmitter.event().name("error").data(msg));
            } catch (Exception ignored) {}
            err.complete();
            return err;
        } catch (Exception e) {
            SseEmitter err = new SseEmitter();
            try { err.send(SseEmitter.event().name("error").data("AUTH_ERROR")); } catch (Exception ignored) {}
            err.complete();
            return err;
        }

    }
}
