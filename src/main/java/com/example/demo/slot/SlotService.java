package com.example.demo.slot;

import com.example.demo.department.Department;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.schedule.staff.entity.StaffSchedule;
import com.example.demo.schedule.staff.repository.StaffScheduleRepository;
import com.example.demo.slot.dto.SlotDayResponse;
import com.example.demo.slot.dto.SlotDto;
import com.example.demo.slot.dto.SlotResponse;
import com.example.demo.staff.Staff;
import com.example.demo.staff.StaffRepository;
import jdk.swing.interop.SwingInterOpUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class SlotService {
    private final SlotRepository slotRepository;
    private final DepartmentRepository departmentRepository;
    private final StaffRepository staffRepository;
    private final StaffScheduleRepository scheduleRepository;

    public List<SlotDayResponse> MonthlyList(LocalDateTime monthly, Integer doctorId){
        Staff doctor = staffRepository.findByStaffId(doctorId);

        LocalDateTime start = monthly.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime end = monthly.withDayOfMonth(monthly.toLocalDate().lengthOfMonth())
                .withHour(23).withMinute(59).withSecond(59);

        List<Slot> slots = slotRepository.findAllByStartTimeBetweenAndStaff(start, end, doctor);

        Map<LocalDate, List<Slot>> grouped = slots.stream()
                .collect(Collectors.groupingBy(slot -> slot.getStartTime().toLocalDate()));

        List<SlotDayResponse> result = new ArrayList<>();

        LocalDate first = monthly.toLocalDate().withDayOfMonth(1);
        LocalDate last = monthly.toLocalDate().withDayOfMonth(monthly.toLocalDate().lengthOfMonth());

        for (LocalDate d = first; !d.isAfter(last); d = d.plusDays(1)) {
            StaffSchedule schedule = scheduleRepository.findByStaffAndWorkDate(doctor, d);
            // 스케줄이 있고 OFF(typeId==3)이면 예약 불가, 스케줄 없으면 가예약 가능으로 진행
            if (schedule != null
                    && schedule.getStaffScheduleType() != null
                    && schedule.getStaffScheduleType().getScheduleTypeId() == 3) {
                String typeName = schedule.getStaffScheduleType().getTypeName();
                result.add(SlotDayResponse.builder()
                        .date(d.toString())
                        .totalCapacity(0)
                        .available(false)
                        .scheduleType(typeName)
                        .build());
                continue;
            }

            List<Slot> daySlots = grouped.getOrDefault(d, new ArrayList<>());

            int totalCapacity = 0;
            boolean available = false;

            for (int hour = 9; hour <= 17; hour++) {
                if(hour==13) continue;

                final int h = hour;

                List<Slot> hourSlots = daySlots.stream()
                        .filter(s -> s.getStartTime().getHour() == h)
                        .toList();

                int hourCapacity;
                if (hourSlots.isEmpty()) {
                    hourCapacity = 3; // 슬롯 없으면 기본 5명
                } else {
                    hourCapacity = hourSlots.stream()
                            .mapToInt(s -> s.getMaxPatient() - s.getCurrentPatient())
                            .sum();
                }
                totalCapacity += hourCapacity;

                if (hourCapacity > 0) {
                    available = true;
                }
            }

            result.add(SlotDayResponse.builder()
                    .date(d.toString())
                    .totalCapacity(totalCapacity)
                    .available(available)
                    .build());
        }
        return result;
    }

    public List<SlotDayResponse> MonthlyListByDepartment(LocalDateTime monthly, Integer departmentId) {
        // 1. 의사 리스트
        Department department = departmentRepository.findByDepartmentId(departmentId);
        List<Staff> doctors = staffRepository.findDoctorsByDepartment(department)
                .orElseThrow(() -> new RuntimeException("Not exist"));

        // 2. 날짜 범위 (LocalDate 기준)
        LocalDate firstDay = monthly.toLocalDate().withDayOfMonth(1);
        LocalDate lastDay = monthly.toLocalDate().withDayOfMonth(monthly.toLocalDate().lengthOfMonth());

        LocalDateTime start = firstDay.atStartOfDay();
        LocalDateTime end = lastDay.atTime(23, 59, 59);

        // 3. 슬롯 한 번에 조회
        List<Slot> allSlots =
                slotRepository.findAllByStartTimeBetweenAndDepartment(start, end, department);

        // 4. 슬롯 Map (날짜_의사_시간)
        Map<String, Integer> slotMap = new HashMap<>();
        for (Slot s : allSlots) {
            String key = s.getStartTime().toLocalDate() + "_"
                    + s.getStaff().getStaffId() + "_"
                    + s.getStartTime().getHour();

            int remain = s.getMaxPatient() - s.getCurrentPatient();
            slotMap.merge(key, remain, Integer::sum);
        }

        // 🔥 5. 스케줄 한 번에 조회 (LocalDate 기반)
        List<StaffSchedule> schedules =
                scheduleRepository.findAllByStaffInAndWorkDateBetween(doctors, firstDay, lastDay);

        // 🔥 6. 스케줄 Map (날짜_의사 → typeId), null-safe
        Map<String, Integer> scheduleMap = new HashMap<>();
        Map<String, String> scheduleTypeNameMap = new HashMap<>();
        for (StaffSchedule s : schedules) {
            String key = s.getWorkDate() + "_" + s.getStaff().getStaffId();
            if (s.getStaffScheduleType() != null) {
                scheduleMap.put(key, s.getStaffScheduleType().getScheduleTypeId());
                scheduleTypeNameMap.put(key, s.getStaffScheduleType().getTypeName());
            } else {
                scheduleMap.put(key, null);
            }
        }

        // 7. 결과 생성
        List<SlotDayResponse> result = new ArrayList<>();

        for (LocalDate d = firstDay; !d.isAfter(lastDay); d = d.plusDays(1)) {

            int totalCapacity = 0;

            for (Staff doc : doctors) {

                String scheduleKey = d + "_" + doc.getStaffId();
                Integer typeId = scheduleMap.get(scheduleKey);

                // 스케줄이 있고 OFF(typeId==3)이면 이 의사는 해당 날 제외, 스케줄 없으면 가예약 가능
                if (typeId != null && typeId == 3) {
                    continue;
                }

                // 시간별 슬롯 계산
                for (int hour = 9; hour <= 17; hour++) {
                    if (hour == 13) continue;

                    String key = d + "_" + doc.getStaffId() + "_" + hour;
                    Integer remain = slotMap.get(key);

                    if (remain == null) {
                        totalCapacity += 3; // 슬롯 없으면 기본값
                    } else {
                        totalCapacity += remain;
                    }
                }
            }

            // 모든 의사가 OFF인 날 → scheduleType 표시
            final LocalDate currentDate = d;
            String offTypeName = null;
            boolean allOff = !doctors.isEmpty() && doctors.stream().allMatch(doc -> {
                Integer t = scheduleMap.get(currentDate + "_" + doc.getStaffId());
                return t != null && t == 3;
            });
            if (allOff) {
                offTypeName = scheduleTypeNameMap.getOrDefault(
                        currentDate + "_" + doctors.get(0).getStaffId(), "OFF");
            }

            result.add(SlotDayResponse.builder()
                    .date(d.toString())
                    .totalCapacity(totalCapacity)
                    .available(totalCapacity > 0)
                    .scheduleType(offTypeName)
                    .build());
        }

        return result;
    }

    public List<SlotDayResponse> MonthlyListByDepartmentInNext(LocalDateTime monthly, Integer departmentId) {

        // 1. 해당 과 의사 리스트
        List<Staff> doctors = staffRepository.findDoctorsByDepartment(
                departmentRepository.findByDepartmentId(departmentId)
        ).orElseThrow(() -> new RuntimeException("Not exist"));

        // 2. 월 범위
        LocalDateTime start = monthly.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime end = monthly.withDayOfMonth(monthly.toLocalDate().lengthOfMonth())
                .withHour(23).withMinute(59).withSecond(59);

        // 3. 슬롯 한 번에 조회 (🔥 중요)
        List<Slot> allSlots = slotRepository.findAllByStartTimeBetweenAndDepartment(start, end,
                departmentRepository.findByDepartmentId(departmentId));

        // 4. (날짜 + 의사 + 시간) 기준으로 미리 Map 만들어두기
        Map<String, Integer> slotMap = new HashMap<>();

        for (Slot s : allSlots) {
            String key = s.getStartTime().toLocalDate() + "_" +
                    s.getStartTime().getHour();

            int remain = s.getMaxPatient() - s.getCurrentPatient();

            slotMap.merge(key, remain, Integer::sum);
        }

        // 5. 결과 생성
        List<SlotDayResponse> result = new ArrayList<>();

        LocalDate firstDay = start.toLocalDate();
        LocalDate lastDay = end.toLocalDate();

        for (LocalDate d = firstDay; !d.isAfter(lastDay); d = d.plusDays(1)) {

            int totalCapacity = 0;

            for (int hour = 9; hour <= 17; hour++) {
                if (hour == 13) continue;

                String key = d + "_" + hour;

                Integer remain = slotMap.get(key);

                if (remain == null) {
                    // 🔥 슬롯 없으면 → 의사 수 * 3
                    totalCapacity += doctors.size() * 3;
                } else {
                    // 🔥 슬롯 있으면 → (max - current) 합
                    totalCapacity += remain;
                }
            }

            result.add(SlotDayResponse.builder()
                    .date(d.toString())
                    .totalCapacity(totalCapacity)
                    .available(totalCapacity > 0)
                    .build());
        }
        return result;
    }

    public List<SlotResponse> DailyList(LocalDateTime daily,
                                        Integer doctorId){
        List<SlotResponse> result = new ArrayList<>();
        LocalDate date = daily.toLocalDate();

        Staff doctor = staffRepository.findByStaffId(doctorId);

        StaffSchedule schedule = scheduleRepository.findByStaffAndWorkDate(doctor, date);
        if (schedule != null
                && schedule.getStaffScheduleType() != null
                && schedule.getStaffScheduleType().getScheduleTypeId() == 3) {
            return result; // OFF면 빈 배열 반환
        }

        LocalDateTime start = date.atTime(9, 0);
        LocalDateTime end = date.atTime(17, 0);

        List<Slot> slots = slotRepository.findAllByStartTimeBetweenAndStaff(start, end, doctor);

        Map<Integer, List<Slot>> slotMap = slots.stream()
                .collect(Collectors.groupingBy(s -> s.getStartTime().getHour()));

        for (int hour = 9; hour <= 17; hour++) {
            if(hour==13) continue;
            List<Slot> hourSlots = slotMap.getOrDefault(hour, new ArrayList<>());

            int availableCount;
            int maxPatient = 3; // 기본값

            LocalDateTime slotTime = date.atTime(hour, 0);

            if (hourSlots.isEmpty()) {
                availableCount = maxPatient;
            } else {
                availableCount = hourSlots.stream()
                        .mapToInt(s -> s.getMaxPatient() - s.getCurrentPatient())
                        .sum();
            }
            SlotResponse slotResponse = new SlotResponse();
            slotResponse.setSlotId(hourSlots.isEmpty() ? null : hourSlots.get(0).getSlotId());
            slotResponse.setDoctorId(doctorId);
            slotResponse.setStartTime(slotTime);
            slotResponse.setCapacity(availableCount);
            slotResponse.setAvailable(true);
            slotResponse.setType(SlotStatus.TREATMENT);

            result.add(slotResponse);
        }

        return result;
    }

    public List<SlotResponse> DailyListByDepartment(LocalDateTime daily,
                                                    Integer departmentId){
        // 1. 해당 과의 의사 리스트 조회
        List<Staff> doctors = staffRepository.findDoctorsByDepartment(
                departmentRepository.findByDepartmentId(departmentId)
        ).orElseThrow(() -> new RuntimeException("Department not found"));

        List<SlotResponse> result = new ArrayList<>();
        LocalDate date = daily.toLocalDate();

        // 2. 하루 9시~17시
        for (int hour = 9; hour <= 17; hour++) {
            if(hour == 13) continue; // 점심시간 제외

            LocalDateTime slotTime = date.atTime(hour, 0);

            // 3. 각 의사의 슬롯 조회 및 합산
            int totalCapacity = 0;
            Integer sampleSlotId = null;

            for (Staff doc : doctors) {
                List<Slot> slots = slotRepository.findAllByStartTimeBetweenAndStaff(
                        slotTime,
                        slotTime.plusHours(1).minusSeconds(1),
                        doc
                );

                if (!slots.isEmpty() && sampleSlotId == null) {
                    sampleSlotId = slots.get(0).getSlotId(); // 임의로 slotId 하나 가져오기
                }

                int capacity = slots.stream()
                        .mapToInt(s -> s.getMaxPatient() - s.getCurrentPatient())
                        .sum();

                // 슬롯 없으면 기본 3명
                if (capacity == 0) capacity = 3;
                totalCapacity += capacity;
            }

            // 4. SlotResponse 생성
            SlotResponse slotResponse = new SlotResponse();
            slotResponse.setSlotId(sampleSlotId);
            slotResponse.setStartTime(slotTime);
            slotResponse.setCapacity(totalCapacity);
            slotResponse.setAvailable(totalCapacity > 0);
            slotResponse.setType(SlotStatus.TREATMENT);

            result.add(slotResponse);
        }

        return result;

    }
}
