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
        System.out.println("SSE 구독 진입");
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        String accessToken = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }

        System.out.println("accessToken======>"+accessToken);

        try {
            if (accessToken == null || accessToken.isBlank()) {
                emitter.send(SseEmitter.event().name("error").data("NO_TOKEN"));
                emitter.complete();
                return emitter;
            }

            Claims claims=null;
            try {
                claims = jWTUtil.validateToken(accessToken);
                System.out.println("==========>"+claims);
            } catch (CustomJWTException e) {
                if ("Expired".equals(e.getMessage())) {
                    emitter.send(SseEmitter.event().name("error").data("TOKEN_REFRESH"));
                    emitter.complete();
                    return emitter;
                } else {
                    throw e;
                }
            }

            Integer claimUserId = Integer.valueOf(claims.get("userId").toString());

            System.out.println("로그인한 의사===========>"+userId);

            if (!userId.equals(claimUserId)) {
                emitter.send(SseEmitter.event().name("error").data("FORBIDDEN"));
                emitter.complete();
                return emitter;
            }
            System.out.println("SSE 구독 요청 userId = " + userId);

            return sseService.subscribe(userId);

        } catch (Exception e) {
            try {
                e.printStackTrace();
                emitter.send(SseEmitter.event().name("error").data("AUTH_ERROR"));
            } catch (Exception ignored) {
                System.out.println(ignored.getMessage());
            }
            emitter.complete();
            return emitter;
        }

    }
}
