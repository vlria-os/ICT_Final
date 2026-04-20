package com.example.demo.security.filter;

import com.example.demo.security.jwtutil.CustomJWTException;
import com.example.demo.security.jwtutil.JWTUtil;
import com.example.demo.security.security.CustomUserDetails;
import com.example.demo.security.security.CustomUserDetailsService;
import com.google.gson.Gson;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

public class JWTCheckFilter extends OncePerRequestFilter {
    private final JWTUtil jwtUtil;

    public JWTCheckFilter(JWTUtil jwtUtil){
        this.jwtUtil=jwtUtil;
    }

    //필터가 동작되지 않을 경로 설정
    //true: 필터 수행 안 함
    //false: 필터 수행함
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path=request.getRequestURI();
        if (path.startsWith("/none") || path.startsWith("/login") || path.startsWith("/logout") ||
                path.startsWith("/join") || path.startsWith("/jwt/token/refresh") || path.startsWith("/ws")
            || path.startsWith("/upload") || path.startsWith("/social") || path.startsWith("/test/upload")
                || path.startsWith("/chatbot/inquiry")){
            return true;
        }

        return false;
    }

    //필터가 수행하는 작업 -> 유효한 jwt 토큰 값인지 검사
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        try{
            String authorizationStr=request.getHeader("Authorization");
            if (authorizationStr == null || !authorizationStr.startsWith("Bearer ")){
                throw new CustomJWTException("NO_AUTH_HEADER");
            }

            //토큰 값
            String accessToken=authorizationStr.substring(7);

            //유효한 토큰인지 검사
            Claims claims=jwtUtil.validateToken(accessToken);

            //사용자 정보 꺼내와서 UserDetails 객체에 저장
            String email=claims.getSubject();
            Integer userId=claims.get("userId", Integer.class);
            String status=claims.get("status", String.class);

            List<String> roles=claims.get("roles", List.class);
            Collection<GrantedAuthority> authorities=new ArrayList<>();
            for (String role:roles){
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
            }

            Integer departmentId=claims.get("departmentId", Integer.class);
            String name=claims.get("name", String.class);

            CustomUserDetails details=
                    new CustomUserDetails(email, userId, status, authorities, departmentId, name);

            //인증된 사용자 정보를 스프링 시큐리티 컨텍스트에 등록
            UsernamePasswordAuthenticationToken authenticationToken=
                    new UsernamePasswordAuthenticationToken(
                            details,
                            null,
                            details.getAuthorities()
                    );
            SecurityContextHolder.getContext().setAuthentication(authenticationToken);
        } catch (CustomJWTException e) {
            sendTokenError(response);
            return;
        } catch (Exception e){
            e.printStackTrace();
            sendTokenError(response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void sendTokenError(HttpServletResponse response) throws IOException{
        Gson gson=new Gson();
        String jsonStr=gson.toJson(Map.of("error","ERROR_ACCESS_TOKEN"));
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=utf-8");
        PrintWriter printWriter=response.getWriter();
        printWriter.println(jsonStr);
        printWriter.close();
    }
}
