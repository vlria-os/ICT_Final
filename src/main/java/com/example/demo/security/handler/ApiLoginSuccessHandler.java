package com.example.demo.security.handler;

import com.example.demo.security.jwtutil.JWTUtil;
import com.example.demo.security.redis.RedisService;
import com.example.demo.security.security.CustomUserDetails;
import com.example.demo.user.UserDto;
import com.google.gson.Gson;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ApiLoginSuccessHandler implements AuthenticationSuccessHandler {
    private final JWTUtil jwtUtil;
    private final RedisService redisService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        CustomUserDetails details=(CustomUserDetails) authentication.getPrincipal();

        Map<String,Object> claims=details.getClaims();

        String accessToken=jwtUtil.generateToken(claims,5);
        String refreshToken= jwtUtil.generateToken(claims,120);
        claims.put("accessToken",accessToken);

        Cookie refreshCookie=new Cookie("refreshToken", refreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(false);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(60 * 60 * 2);

        response.addCookie(refreshCookie);

        redisService.save(details.getUserId(), refreshToken, 120);

        Gson gson=new Gson();
        String jsonStr=gson.toJson(claims);
        response.setContentType("application/json;charset=utf-8");
        PrintWriter pw= response.getWriter();
        pw.println(jsonStr);
        pw.close();
    }
}
