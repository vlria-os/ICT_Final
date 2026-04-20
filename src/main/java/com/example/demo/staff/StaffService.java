package com.example.demo.staff;

import com.example.demo.department.Department;
import com.example.demo.department.DepartmentDto;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.role.Role;
import com.example.demo.role.RoleRepository;
import com.example.demo.staff.dto.*;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import com.example.demo.userRole.UserRole;
import com.example.demo.userRole.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class StaffService {
    private final StaffRepository staffRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    private static final Map<String, List<String>> POSITION_ROLE_MAP = Map.ofEntries(
        Map.entry("INTERN",             List.of("DOCTOR")),
        Map.entry("SPECIALIST",         List.of("DOCTOR")),
        Map.entry("HEAD_DOCTOR",        List.of("DOCTOR")),
        Map.entry("RESIDENT",           List.of("DOCTOR", "RESIDENT")),
        Map.entry("FELLOW",             List.of("DOCTOR", "FELLOW")),
        Map.entry("PROFESSOR",          List.of("DOCTOR", "PROFESSOR")),
        Map.entry("NURSE",              List.of("NURSE")),
        Map.entry("CHARGE_NURSE",       List.of("NURSE")),
        Map.entry("DIRECTOR_NURSE",     List.of("NURSE")),
        Map.entry("HEAD_NURSE",         List.of("NURSE", "HEAD_NURSE")),
        Map.entry("STAFF",              List.of("STAFF")),
        Map.entry("ASSISTANT_MANAGER",  List.of("STAFF")),
        Map.entry("MANAGER",            List.of("STAFF", "MANAGER")),
        Map.entry("ADMIN",              List.of("ADMIN"))
    );

    private void saveUserRoles(User user, String position) {
        userRoleRepository.deleteByUser(user);
        List<String> roleNames = POSITION_ROLE_MAP.getOrDefault(position, List.of());
        for (String roleName : roleNames) {
            Role role = roleRepository.findByRoleName(roleName);
            if (role != null) {
                userRoleRepository.save(UserRole.builder().user(user).role(role).build());
            }
        }
    }

    //직원등록
    public Integer register(StaffRegisterDto dto){
        User user=null;
        if(dto.getUserId() !=null){
            user = userRepository.findById(dto.getUserId())
                    .orElseThrow(()-> new RuntimeException("해당 유저가 없습니다"));
        }

        Department department=null;
        if(dto.getDepartmentId() !=null){
            department=departmentRepository.findById(dto.getDepartmentId())
                    .orElseThrow(()->new RuntimeException("해당 부서가 없습니다"));
        }

        Staff manager = null;
        if(dto.getManagerId() !=null){
            manager = staffRepository.findById(dto.getManagerId())
                    .orElseThrow(()-> new RuntimeException("해당 담당자가 없습니다"));
        }

        Staff staff= Staff.builder()
                .user(user)
                .department(department)
                .manager(manager)
                .position(dto.getPosition())
                .name(dto.getName())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .isActive(dto.getIsActive() !=null ? dto.getIsActive() : "Y")
                .build();

        Staff savedStaff = staffRepository.save(staff);

        if (user != null && dto.getPosition() != null) {
            saveUserRoles(user, dto.getPosition());
        }

        return savedStaff.getStaffId();
    }

    //직원엑셀 일괄등록
    public StaffBulkUploadResponseDto bulkUpload(List<StaffBulkUploadRequestDto> requestList){
        List<Staff> successList = new ArrayList<>();
        List<StaffBulkUploadResponseDto.FailDetail> failList=new ArrayList<>();

        for(int i =0; i<requestList.size(); i++){
            StaffBulkUploadRequestDto dto=requestList.get(i);
            int rowNum = i +1;

            try{
                //UserId로 User조회
                User user = userRepository.findById(dto.getUserId())
                        .orElseThrow(()-> new RuntimeException("존재하지않는 user입니다"));

                //부서명으로 department조회
                Department department = departmentRepository.findByDepartmentName(dto.getDept_name())
                        .orElseThrow(()-> new RuntimeException("존재하지 않는 부서명입니다"));

                //담당자 userId로 staff조회 없으면 null
                Staff manager = null;
                if (dto.getManagerId() != null) {
                    manager = staffRepository.findById(dto.getManagerId())
                            .orElseThrow(() -> new RuntimeException("존재하지 않는 담당자입니다"));
                }
                Staff staff = Staff.builder()
                        .user(user)
                        .department(department)
                        .manager(manager)
                        .position(dto.getPosition())
                        .name(dto.getName())
                        .phone(dto.getPhone())
                        .address(dto.getAddress())
                        .isActive(dto.getIsActive())
                        .build();
                successList.add(staff);
                if (dto.getPosition() != null) {
                    saveUserRoles(user, dto.getPosition());
                }
            }catch (Exception e){
                failList.add(StaffBulkUploadResponseDto.FailDetail.builder()
                        .row(rowNum)
                        .userId(dto.getUserId() !=null ? dto.getUserId().toString():"-")
                                .name(dto.getName())
                                .reason(e.getMessage())
                                .build()
                        );
            }
        }
        //정상행만 일괄저장
        if(!successList.isEmpty()){
            staffRepository.saveAll(successList);
        }
        return StaffBulkUploadResponseDto.builder()
                .successCount(successList.size())
                .failCount(failList.size())
                .failDetails(failList)
                .build();
    }

    //전체조회 (페이징 + 키워드 검색)
    public Page<StaffResponseDto> getAllStaff(String keyword, Pageable pageable){
        if (keyword == null || keyword.isBlank()) {
            return staffRepository.findAll(pageable).map(this::entityToDto);
        }
        return staffRepository.findAllWithKeyword(keyword, pageable).map(this::entityToDto);
    }

    //Entity->dto
    private StaffResponseDto entityToDto(Staff staff){
        return StaffResponseDto.builder()
                .staffId(staff.getStaffId())
                .name(staff.getName())
                .position(staff.getPosition())
                .phone(staff.getPhone())
                .address(staff.getAddress())
                .isActive(staff.getIsActive())
                .userId(staff.getUser() != null? staff.getUser().getUserId() : null)
                .email(staff.getUser() !=null? staff.getUser().getEmail():null)
                .departmentId(staff.getDepartment() !=null? staff.getDepartment().getDepartmentId():null)
                .departmentName(staff.getDepartment() !=null? staff.getDepartment().getDepartmentName() : null)
                .managerId(staff.getManager() != null? staff.getManager().getStaffId() : null)
                .managerName(staff.getManager() != null? staff.getManager().getName(): null)
                .build();
    }

    public Map<String, Object> getDoctor(DepartmentDto departmentDto) {
        Department department = departmentRepository.findByDepartmentId(departmentDto.getDepartmentId());
        List<StaffDto> list = staffRepository.findDoctorsByDepartment(department)
                .orElseThrow(() -> new RuntimeException("Not exist"))
                .stream()
                .map(doc -> StaffDto.builder()
                        .staffId(doc.getStaffId())
                        .name(doc.getName())
                        .build())
                .toList();
        return Map.of("content", list);
    }

    //상세조회
    public StaffResponseDto getStaffById(Integer staffId){
        Staff staff=staffRepository.findById(staffId)
                .orElseThrow(()->new RuntimeException("해당 직원이 없습니다"));
        return entityToDto(staff);
    }

    //수정
    public void updateStaff(StaffUpdateDto dto) {

        if (dto.getStaffId() == null) {
            throw new RuntimeException("staffId는 필수입니다.");
        }
        if (dto.getUserId() == null) {
            throw new RuntimeException("userId는 필수입니다.");
        }
        if (dto.getDepartmentId() == null) {
            throw new RuntimeException("departmentId는 필수입니다.");
        }

        Staff staff = staffRepository.findById(dto.getStaffId())
                .orElseThrow(() -> new RuntimeException("해당 직원이 없습니다."));

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("해당 유저가 없습니다."));

        Department department = departmentRepository.findById(dto.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("해당 부서가 없습니다."));

        Staff manager = null;
        if (dto.getManagerId() != null) {
            manager = staffRepository.findById(dto.getManagerId())
                    .orElseThrow(() -> new RuntimeException("해당 매니저가 없습니다."));
        }

        staff.setUser(user);
        staff.setDepartment(department);
        staff.setManager(manager);
        staff.setPosition(dto.getPosition());
        staff.setName(dto.getName());
        staff.setPhone(dto.getPhone());
        staff.setAddress(dto.getAddress());
        staff.setIsActive(dto.getIsActive());

        if (dto.getPosition() != null) {
            saveUserRoles(user, dto.getPosition());
        }
    }

    //soft delete
    public void updateIsActive(Integer staffId, String isActive){
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("해당 직원이 없습니다"));

        staff.setIsActive(isActive);
    }
}