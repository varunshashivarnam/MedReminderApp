package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.LocalDateTime;

@Entity
public class AchievementRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String code;   // STREAK_7, STREAK_30, DOSES_100, PERFECT_WEEK, PERFECT_MONTH, EARLY_BIRD, CONSISTENCY_CHAMPION
    private LocalDateTime unlockedAt;

    public AchievementRecord() {
    }

    public AchievementRecord(String code, LocalDateTime unlockedAt) {
        this.code = code;
        this.unlockedAt = unlockedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public LocalDateTime getUnlockedAt() { return unlockedAt; }
    public void setUnlockedAt(LocalDateTime unlockedAt) { this.unlockedAt = unlockedAt; }
}
