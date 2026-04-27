package com.example.demo.surgery;

import com.example.demo.patient.Patient;
import com.example.demo.patient.PatientRepository;
import com.example.demo.reservation.service.AvailabilityService;
import com.example.demo.slot.Slot;
import com.example.demo.slot.SlotRepository;
import com.example.demo.slot.SlotStatus;
import com.example.demo.staff.Staff;
import com.example.demo.staff.StaffRepository;
import com.example.demo.surgery.dto.SurgeryDto;
import com.example.demo.surgery.dto.SurgeryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class SurgeryService {

    private final SurgeryRepository surgeryRepository;
    private final SlotRepository slotRepository;
    private final StaffRepository staffRepository;
    private final PatientRepository patientRepository;
    private final AvailabilityService availabilityService;

    // 일반 수술 예약 - 충돌 체크 후 슬롯 생성
    public SurgeryResponse scheduleSurgery(SurgeryDto dto) {
        Staff doctor = staffRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        LocalDateTime endTime = dto.getStartTime().plusHours(dto.getDurationHours());

        LocalDate workDate = dto.getStartTime().toLocalDate();
        LocalTime requestStart = dto.getStartTime().toLocalTime();
        LocalTime requestEnd = endTime.toLocalTime();

        // startTime ~ endTime 각 시간대 충돌 체크 (점유 중인 슬롯만)
        LocalDateTime current = dto.getStartTime();
        while (current.isBefore(endTime)) {
            final LocalDateTime slotTime = current;
            slotRepository.findByStartTimeAndStaff(slotTime, doctor)
                    .filter(s -> s.getCurrentPatient() > 0)
                    .ifPresent(s -> { throw new RuntimeException("해당 시간에 이미 스케줄이 존재합니다: " + slotTime); });
            current = current.plusHours(1);
        }

        Surgery surgery = surgeryRepository.save(Surgery.builder()
                .patient(patient)
                .doctor(doctor)
                .status(SurgeryStatus.SCHEDULED)
                .description(dto.getDescription())
                .startTime(dto.getStartTime())
                .endTime(endTime)
                .build());

        createSurgerySlots(doctor, dto.getStartTime(), endTime);

        return toResponse(surgery, patient, doctor);
    }

    // 응급 수술 - 충돌 체크 없이 강제 슬롯 점유
    public SurgeryResponse scheduleEmergencySurgery(SurgeryDto dto) {
        Staff doctor = staffRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        LocalDateTime endTime = dto.getStartTime().plusHours(dto.getDurationHours());

        Surgery surgery = surgeryRepository.save(Surgery.builder()
                .patient(patient)
                .doctor(doctor)
                .status(SurgeryStatus.EMERGENCY)
                .description(dto.getDescription())
                .startTime(dto.getStartTime())
                .endTime(endTime)
                .build());

        createSurgerySlots(doctor, dto.getStartTime(), endTime);

        return toResponse(surgery, patient, doctor);
    }

    // 수술 취소 - 연결된 슬롯 currentPatient=0, status=CANCELLED
    public void cancelSurgery(Integer surgeryId) {
        Surgery surgery = surgeryRepository.findById(surgeryId)
                .orElseThrow(() -> new RuntimeException("Surgery not found"));

        if (surgery.getEndTime() != null) {
            slotRepository.findAllByStartTimeBetweenAndStaff(
                    surgery.getStartTime(),
                    surgery.getEndTime().minusHours(1),
                    surgery.getDoctor()
            ).forEach(slot -> {
                if (slot.getType() == SlotStatus.SURGERY){
                    slotRepository.delete(slot);
                }
            });
        } else {
            slotRepository.findByStartTimeAndStaff(surgery.getStartTime(), surgery.getDoctor())
                    .ifPresent(slot -> {
                        if(slot.getType() == SlotStatus.SURGERY){
                            slotRepository.delete(slot);
                        }
                    });
        }

        surgery.setStatus(SurgeryStatus.CANCELLED);
    }

    // 수술 수정 - 기존 슬롯 해제 후 새 슬롯 재생성
    public SurgeryResponse updateSurgery(SurgeryDto dto) {
        Surgery surgery = surgeryRepository.findById(dto.getSurgeryId())
                .orElseThrow(() -> new RuntimeException("Surgery not found"));

        Staff doctor = staffRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        LocalDateTime newEndTime = dto.getStartTime().plusHours(dto.getDurationHours());

        LocalDate workDate = dto.getStartTime().toLocalDate();
        LocalTime requestStart = dto.getStartTime().toLocalTime();
        LocalTime requestEnd = newEndTime.toLocalTime();

        if(!availabilityService.isStaffAvailable(
                doctor.getStaffId(),
                workDate,
                requestStart,
                requestEnd
        )){
            throw new IllegalStateException("해당 의사의 근무시간이 아닙니다");
        }
        // 기존 슬롯 삭제
        if (surgery.getEndTime() != null) {
            slotRepository.findAllByStartTimeBetweenAndStaff(
                    surgery.getStartTime(),
                    surgery.getEndTime().minusHours(1),
                    surgery.getDoctor()
            ).forEach(slot -> {
                if (slot.getType() == SlotStatus.SURGERY) slotRepository.delete(slot);
            });
        } else {
            slotRepository.findByStartTimeAndStaff(surgery.getStartTime(), surgery.getDoctor())
                    .ifPresent(slot -> {
                        if (slot.getType() == SlotStatus.SURGERY) slotRepository.delete(slot);
                    });
        }

        // 새 시간 충돌 체크 (점유 중인 슬롯만)
        LocalDateTime current = dto.getStartTime();
        while (current.isBefore(newEndTime)) {
            final LocalDateTime slotTime = current;
            slotRepository.findByStartTimeAndStaff(slotTime, doctor)
                    .filter(s -> s.getCurrentPatient() > 0)
                    .ifPresent(s -> { throw new RuntimeException("해당 시간에 이미 스케줄이 존재합니다: " + slotTime); });
            current = current.plusHours(1);
        }

        // 새 슬롯 생성
        createSurgerySlots(doctor, dto.getStartTime(), newEndTime);

        // surgery 정보 업데이트
        surgery.setDoctor(doctor);
        surgery.setPatient(patient);
        surgery.setStartTime(dto.getStartTime());
        surgery.setEndTime(newEndTime);
        surgery.setDescription(dto.getDescription());
        if (dto.getStatus() != null) {
            surgery.setStatus(dto.getStatus());
        }

        return toResponse(surgery, patient, doctor);
    }

    // 전체 수술 목록 조회
    @Transactional(readOnly = true)
    public List<SurgeryResponse> getSurgeryList() {
        return surgeryRepository.findAllByOrderByStartTimeAsc().stream()
                .map(s -> toResponse(s, s.getPatient(), s.getDoctor()))
                .collect(Collectors.toList());
    }

    // startTime ~ endTime 사이 1시간 단위 슬롯 생성
    private void createSurgerySlots(Staff doctor, LocalDateTime startTime, LocalDateTime endTime) {
        LocalDateTime current = startTime;
        while (current.isBefore(endTime)) {
            slotRepository.save(Slot.builder()
                    .staff(doctor)
                    .department(doctor.getDepartment())
                    .startTime(current)
                    .maxPatient(1)
                    .currentPatient(1)
                    .type(SlotStatus.SURGERY)
                    .build());
            current = current.plusHours(1);
        }
    }

    // 엔티티 → 응답 DTO 변환
    private SurgeryResponse toResponse(Surgery surgery, Patient patient, Staff doctor) {
        return SurgeryResponse.builder()
                .surgeryId(surgery.getSurgeryId())
                .patientId(patient.getPatientId())
                .patientName(patient.getName())
                .doctorId(doctor.getStaffId())
                .doctorName(doctor.getName())
                .status(surgery.getStatus())
                .description(surgery.getDescription())
                .startTime(surgery.getStartTime())
                .endTime(surgery.getEndTime())
                .createdAt(surgery.getCreatedAt())
                .build();
    }
}