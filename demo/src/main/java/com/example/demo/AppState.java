package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import java.time.LocalDate;

/** Singleton row (id=1) holding app-level counters that survive restarts. */
@Entity
public class AppState {
    @Id
    private Long id;

    private LocalDate currentDay;
    private int streak;
    private int longestStreak;

    public AppState() {
    }

    public AppState(Long id, LocalDate currentDay, int streak, int longestStreak) {
        this.id = id;
        this.currentDay = currentDay;
        this.streak = streak;
        this.longestStreak = longestStreak;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getCurrentDay() { return currentDay; }
    public void setCurrentDay(LocalDate currentDay) { this.currentDay = currentDay; }
    public int getStreak() { return streak; }
    public void setStreak(int streak) { this.streak = streak; }
    public int getLongestStreak() { return longestStreak; }
    public void setLongestStreak(int longestStreak) { this.longestStreak = longestStreak; }
}
