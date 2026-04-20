package com.example.demo.socialAccount;

import com.example.demo.patient.Patient;
import com.example.demo.patient.PatientRepository;
import com.example.demo.role.Role;
import com.example.demo.role.RoleRepository;
import com.example.demo.socialAccount.dto.*;
import com.example.demo.staff.Staff;
import com.example.demo.staff.StaffRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserDto;
import com.example.demo.user.UserRepository;
import com.example.demo.userRole.UserRole;
import com.example.demo.userRole.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class SocialAccountService {
    @Value("${naver.client-id}")
    private String naverClientId;
    @Value("${naver.client-secret}")
    private String naverClientSecret;

    @Value("${kakao.client-id}")
    private String kakaoClientId;
    @Value("${kakao.redirect-uri}")
    private String kakaoRedirectUri;
    @Value("${kakao.client-secret}")
    private String kakaoClientSecret;

    private final RestTemplate restTemplate=new RestTemplate();
    private final SocialAccountRepository socialAccountRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    public Map<String, Object> registerKakaoAccount(KakaoLoginRequest request){
        String provider=request.getProvider();
        if (provider == null || provider.trim().isEmpty() || !"KAKAO".equals(provider)){
            throw new RuntimeException("PROVIDER_IS_INCORRECT");
        }

        String providerId=request.getProviderId();
        if(providerId == null || providerId.trim().isEmpty()){
            throw new RuntimeException("PROVIDER_ID_IS_NULL");
        }

        String name=request.getName();
        if (name == null || name.trim().isEmpty()){
            throw new RuntimeException("NAME_IS_NULL");
        }

        String rrn=request.getRrn();
        if (rrn == null || rrn.trim().isEmpty()){
            throw new RuntimeException("RRN_IS_NULL");
        }

        Patient patient=patientRepository.findByRrn(rrn);
        if (patient == null){
            //신규 회원가입
            String makeEmail="SOCIAL_KAKAO_" + UUID.randomUUID();
            String email=makeEmail.substring(0, 49);
            String password="SOCIAL";

            User user=userRepository.save(User.builder()
                    .email(email)
                    .password(password)
                    .status("Y").build());

            Role role=roleRepository.findByRoleName("PATIENT");
            userRoleRepository.save(UserRole.builder()
                    .user(user)
                    .role(role).build());

            Patient savedPatient=patientRepository.save(Patient.builder()
                    .user(user)
                    .rrn(rrn)
                    .name(name).build());

            SocialAccount account=socialAccountRepository.save(SocialAccount.builder()
                    .user(savedPatient.getUser())
                    .provider(SocialAccountProvider.KAKAO)
                    .providerId(providerId).build());
            return Map.of("name", patient.getName(), "user", account.getUser());
        } else {
            if (patient.getUser() == null){
                //유저 계정 생성 후 소셜 로그인
                String makeEmail="SOCIAL_KAKAO_" + UUID.randomUUID();
                String email=makeEmail.substring(0, 49);
                String password="SOCIAL";

                User user=userRepository.save(User.builder()
                        .email(email)
                        .password(password)
                        .status("Y").build());

                Role role=roleRepository.findByRoleName("PATIENT");
                userRoleRepository.save(UserRole.builder()
                        .user(user)
                        .role(role).build());
                patient.setUser(user);

                SocialAccount account=socialAccountRepository.save(SocialAccount.builder()
                        .user(user)
                        .provider(SocialAccountProvider.KAKAO)
                        .providerId(providerId).build());
                return Map.of("name", patient.getName(), "user", account.getUser());
            } else {
                //소셜 로그인 등록
                SocialAccount account=socialAccountRepository.save(SocialAccount.builder()
                        .user(patient.getUser())
                        .provider(SocialAccountProvider.KAKAO)
                        .providerId(providerId).build());
                return Map.of("name", patient.getName(), "user", account.getUser());
            }
        }
    }

    public Map<String, Object> kakaoLogin(String code){
        String accessToken=getKakaoAccessToken(code);

        Map<String, Object> userInfo=getKakaoUserInfo(accessToken);

        Long kakaoId=((Number) userInfo.get("id")).longValue();
        String providerId=String.valueOf(kakaoId);

        Map<String, Object> result=new HashMap<>();
        result.put("providerId", providerId);

        return result;
    }

    private String getKakaoAccessToken(String code){
        RestTemplate restTemplate=new RestTemplate();

        String url = "https://kauth.kakao.com/oauth/token";

        HttpHeaders headers=new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params=new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", kakaoClientId);
        params.add("redirect_uri", kakaoRedirectUri);
        params.add("code", code);
        params.add("client_secret", kakaoClientSecret);

        HttpEntity<MultiValueMap<String, String>> request=new HttpEntity<>(params, headers);

        ResponseEntity<KakaoTokenResponse> response=restTemplate.postForEntity(url, request, KakaoTokenResponse.class);

        KakaoTokenResponse body=response.getBody();

        if (body == null || body.getAccess_token() == null) {
            throw new RuntimeException("카카오 access token을 가져오지 못했습니다.");
        }

        return body.getAccess_token();
    }

    private Map<String, Object> getKakaoUserInfo(String accessToken){
        RestTemplate restTemplate=new RestTemplate();

        String url="https://kapi.kakao.com/v2/user/me";

        HttpHeaders headers=new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request=new HttpEntity<>(headers);

        ResponseEntity<Map> response=restTemplate.exchange(
                url,
                HttpMethod.GET,
                request,
                Map.class
        );

        Map<String, Object> body=response.getBody();

        if (body == null || body.get("id") == null){
            throw new RuntimeException("카카오 사용자 id를 가져오지 못했습니다.");
        }

        return body;
    }

    public Map<String, Object> registerNaverAccount(NaverLoginRequest request){
        String provider=request.getProvider();
        if (provider == null || provider.trim().isEmpty() || !"NAVER".equals(provider)){
            throw new RuntimeException("PROVIDER_IS_INCORRECT");
        }

        String providerId=request.getProviderId();
        if(providerId == null || providerId.trim().isEmpty()){
            throw new RuntimeException("PROVIDER_ID_IS_NULL");
        }

        String name=request.getName();
        if (name == null || name.trim().isEmpty()){
            throw new RuntimeException("NAME_IS_NULL");
        }

        String rrn=request.getRrn();
        if (rrn == null || rrn.trim().isEmpty()){
            throw new RuntimeException("RRN_IS_NULL");
        }

        Patient patient=patientRepository.findByRrn(rrn);
        if (patient == null){
            //신규 회원가입
            String makeEmail="SOCIAL_NAVER_" + UUID.randomUUID();
            String email=makeEmail.substring(0, 49);
            String password="SOCIAL";

            User user=userRepository.save(User.builder()
                    .email(email)
                    .password(password)
                    .status("Y").build());

            Role role=roleRepository.findByRoleName("PATIENT");
            userRoleRepository.save(UserRole.builder()
                    .user(user)
                    .role(role).build());

            Patient savedPatient=patientRepository.save(Patient.builder()
                    .user(user)
                    .rrn(rrn)
                    .name(name)
                    .phone(request.getMobile() != null ? request.getMobile() : null)
                    .gender(request.getGender() != null ? request.getGender() : null).build());

            SocialAccount account=socialAccountRepository.save(SocialAccount.builder()
                    .user(savedPatient.getUser())
                    .provider(SocialAccountProvider.NAVER)
                    .providerId(providerId).build());

            return Map.of("name", patient.getName(), "user", account.getUser());
        } else {
            if (patient.getUser() == null){
                //유저 계정 생성 후 소셜 로그인
                String makeEmail="SOCIAL_NAVER_" + UUID.randomUUID();
                String email=makeEmail.substring(0, 49);
                String password="SOCIAL";

                User user=userRepository.save(User.builder()
                        .email(email)
                        .password(password)
                        .status("Y").build());

                Role role=roleRepository.findByRoleName("PATIENT");
                userRoleRepository.save(UserRole.builder()
                        .user(user)
                        .role(role).build());
                patient.setUser(user);

                SocialAccount account=socialAccountRepository.save(SocialAccount.builder()
                        .user(user)
                        .provider(SocialAccountProvider.NAVER)
                        .providerId(providerId).build());
                return Map.of("name", patient.getName(), "user", account.getUser());
            } else {
                //소셜 로그인 등록
                SocialAccount account=socialAccountRepository.save(SocialAccount.builder()
                        .user(patient.getUser())
                        .provider(SocialAccountProvider.NAVER)
                        .providerId(providerId).build());
                return Map.of("name", patient.getName(), "user", account.getUser());
            }
        }
    }

    public Map<String, Object> verifyUser(SocialAccountProvider provider, String providerId){
        SocialAccount account=socialAccountRepository.findByProviderAndProviderId(provider, providerId);
        if (account != null){
            Patient patient=patientRepository.findByUser(account.getUser());
            return Map.of("name", patient.getName(), "user", patient.getUser());
        } else {
            return null;
        }
    }

    public NaverUserInfoResponse getNaverUserInfo(String accessToken){
        String url = "https://openapi.naver.com/v1/nid/me";

        HttpHeaders headers=new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> entity=new HttpEntity<>(headers);

        ResponseEntity<NaverUserInfoResponse> response=restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                NaverUserInfoResponse.class
        );
        return response.getBody();
    }

    public NaverTokenResponse getNaverAccessToken(String code, String state){
        String url = "https://nid.naver.com/oauth2.0/token" +
                "?grant_type=authorization_code" +
                "&client_id=" + naverClientId +
                "&client_secret=" + naverClientSecret +
                "&code=" + code +
                "&state=" + state;

        ResponseEntity<NaverTokenResponse> response=
                restTemplate.getForEntity(url, NaverTokenResponse.class);

        return response.getBody();
    }
}
