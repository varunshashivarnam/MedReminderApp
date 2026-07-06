package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

interface MedicationRepository extends JpaRepository<Medication, Long> {
}

interface DoseLogRepository extends JpaRepository<DoseLog, Long> {
    List<DoseLog> findByDate(LocalDate date);
    List<DoseLog> findByDateBetween(LocalDate from, LocalDate to);
    Optional<DoseLog> findFirstByMedicationIdAndDate(Long medicationId, LocalDate date);
    long countByStatus(String status);
    long countByStatusAndAtBefore(String status, LocalDateTime before);
    void deleteByMedicationIdAndDate(Long medicationId, LocalDate date);
}

interface ActivityRepository extends JpaRepository<ActivityEvent, Long> {
    List<ActivityEvent> findTop20ByOrderByAtDesc();
    List<ActivityEvent> findTop50ByTagOrderByAtDesc(String tag);
}

interface HealthRepository extends JpaRepository<HealthEntry, Long> {
    List<HealthEntry> findTop100ByOrderByAtDesc();
}

interface AchievementRepository extends JpaRepository<AchievementRecord, Long> {
    boolean existsByCode(String code);
}

interface AppStateRepository extends JpaRepository<AppState, Long> {
}
