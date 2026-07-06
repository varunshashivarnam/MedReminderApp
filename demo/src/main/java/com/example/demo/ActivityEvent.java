package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.LocalDateTime;

@Entity
public class ActivityEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 500)
    private String message;
    private String tag;      // Taken, Logged, Added, Updated, Deleted, Skipped, Achievement
    private LocalDateTime at;

    public ActivityEvent() {
    }

    public ActivityEvent(String message, String tag, LocalDateTime at) {
        this.message = message;
        this.tag = tag;
        this.at = at;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }
    public LocalDateTime getAt() { return at; }
    public void setAt(LocalDateTime at) { this.at = at; }
}
