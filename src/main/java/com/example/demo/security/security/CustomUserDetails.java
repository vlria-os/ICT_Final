package com.example.demo.security.security;

import com.example.demo.user.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.*;

public class CustomUserDetails implements UserDetails {
    private Integer departmentId;
    private Integer userId;
    private String password;
    private String email;
    private String status;
    private Collection<? extends GrantedAuthority> authorities;
    private String name;


    public CustomUserDetails(User user, Integer departmentId, String name){
        this.departmentId=departmentId;
        this.userId=user.getUserId();
        this.password=user.getPassword();
        this.email=user.getEmail();
        this.status=user.getStatus();
        this.authorities=user.getUserRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getRole().getRoleName()))
                .toList();
        this.name=name;
    }

    public CustomUserDetails(String email, Integer userId, String status,
                                Collection<? extends GrantedAuthority> authorities, Integer departmentId, String name){
        this.userId=userId;
        this.password=null;
        this.email=email;
        this.status=status;
        this.authorities=authorities;
        this.departmentId=departmentId;
        this.name=name;
    }

    public Integer getDepartmentId(){
        return departmentId;
    }

    public Integer getUserId(){
        return userId;
    }

    public String getStatus(){
        return status;
    }

    public String getName() {
        return name;
    }

    //사용자 권한을 Collection으로 반환
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }
    @Override
    public String getPassword() {
        return password;
    }
    @Override
    public String getUsername() {
        return email;
    }

    public Map<String,Object> getClaims(){ //JWT 관련
        Map<String,Object> dataMap=new HashMap<>();
        dataMap.put("userId", userId);
        dataMap.put("email", email);
        dataMap.put("status", status);
        dataMap.put("roles", authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .map(role -> role.startsWith("ROLE_") ? role.substring(5) : role)
                .toList());
        if (departmentId != null){
            dataMap.put("departmentId", departmentId);
        }
        return dataMap;
    }
}
