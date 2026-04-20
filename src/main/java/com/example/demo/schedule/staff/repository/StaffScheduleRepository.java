package com.example.demo.schedule.staff.repository;

import com.example.demo.schedule.staff.entity.StaffSchedule;
import com.example.demo.staff.Staff;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StaffScheduleRepository extends JpaRepository<StaffSchedule, Integer> {
    Optional<StaffSchedule> findByStaff_StaffIdAndWorkDate(Integer staffId, LocalDate workDate);

    boolean existsByStaff_StaffIdAndWorkDate(Integer staffId, LocalDate workDate);

    Optional<StaffSchedule> findByStaff_StaffIdAndWorkDateAndScheduleIdNot(
            Integer staffId,
            LocalDate workDate,
            Integer scheduleId
    );

    boolean existsByStaff_StaffIdAndWorkDateAndScheduleIdNot(
            Integer staffId,
            LocalDate workDate,
            Integer scheduleId
    );

    List<StaffSchedule> findByStatusAndStaffScheduleType_ScheduleTypeIdAndWorkDateAndStaffIn(String status, Integer typeId, LocalDate date, List<Staff> staff);
    List<StaffSchedule> findByStatusAndStaffScheduleType_ScheduleTypeIdAndWorkDateBetweenAndStaffIn(String status,
                                                                                                       Integer typeId,
                                                                                                       LocalDate start,
                                                                                                       LocalDate end,
                                                                                                       List<Staff> staff);

    StaffSchedule findByStaffAndStatusAndStaffScheduleType_ScheduleTypeIdAndWorkDate(Staff staff, String status,
                                                                                     Integer typeId, LocalDate date);
    List<StaffSchedule> findByStaffAndStatusAndStaffScheduleType_ScheduleTypeIdAndWorkDateBetween(Staff staff, String status,
                                                                                                  Integer typeId, LocalDate start,
                                                                                                  LocalDate end);

    StaffSchedule findByStaffAndWorkDate(Staff staff, LocalDate workDate);

    List<StaffSchedule> findAllByStaffInAndWorkDateBetween(Collection<Staff> staff, LocalDate workDateAfter, LocalDate workDateBefore);

    @Query("""
        select s from StaffSchedule s
        where (:staffId is null or s.staff.staffId = :staffId)
        and (:startDate is null or s.workDate >= :startDate)
        and (:endDate is null or s.workDate <= :endDate)
    """)
    Page<StaffSchedule> findAllWithFilter(
            @Param("staffId") Integer staffId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable
    );
}
