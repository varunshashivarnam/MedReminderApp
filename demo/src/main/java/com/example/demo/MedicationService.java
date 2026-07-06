package com.example.demo;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@Service
@Transactional
public class MedicationService {

    private final MedicationRepository meds;
    private final DoseLogRepository doses;
    private final ActivityRepository activities;
    private final HealthRepository health;
    private final AchievementRepository achievements;
    private final AppStateRepository appState;

    /** Minutes after the scheduled time before an untaken dose counts as "missed" today. */
    static final int MISSED_GRACE_MINUTES = 60;

    public MedicationService(MedicationRepository meds, DoseLogRepository doses, ActivityRepository activities,
                             HealthRepository health, AchievementRepository achievements, AppStateRepository appState) {
        this.meds = meds;
        this.doses = doses;
        this.activities = activities;
        this.health = health;
        this.achievements = achievements;
        this.appState = appState;
        seedIfEmpty();
    }

    // ==================== Seeding ====================

    private void seedIfEmpty() {
        if (meds.count() > 0) {
            return;
        }
        seedMed("Lisinopril", "10mg", "08:00", "Daily", "1 tablet with water", "Heart", "#2563eb",
                "Dr. Patel", "CVS Pharmacy", "RX-482913", 24, true, false, true);
        seedMed("Metformin", "500mg", "12:00", "Daily", "1 tablet with meals", "Diabetes", "#12b76a",
                "Dr. Patel", "CVS Pharmacy", "RX-482914", 32, true, false, true);
        seedMed("Atorvastatin", "10mg", "14:30", "Daily", "1 tablet", "Heart", "#7c5cfc",
                "Dr. Patel", "CVS Pharmacy", "RX-491230", 8, false, false, false);
        seedMed("Amlodipine", "5mg", "18:00", "Daily", "1 tablet", "Heart", "#f59e0b",
                "Dr. Patel", "Walgreens", "RX-491231", 19, false, false, false);
        seedMed("Tretinoin", "0.025% cream", "21:30", "Daily", "Pea-sized amount on dry skin", "Skincare", "#f43f5e",
                "Dr. Kim (Derm)", "Walgreens", "RX-502117", null, false, true, false);
        seedMed("Vitamin D3", "1000 IU", "", "Weekly", "1 capsule with food", "Supplement", "#0d9488",
                null, null, null, 40, true, false, false);
        seedMed("Omeprazole", "20mg", "", "As needed", "1 capsule before breakfast", "Other", "#6366f1",
                null, null, null, 12, true, false, false);
        seedMed("Ibuprofen", "200mg", "", "As needed", "1-2 tablets, max 6/day", "Pain Relief", "#98a2b3",
                null, null, null, 30, true, false, false);

        // ~60 days of plausible dose history so charts, streaks and analytics have data.
        List<Medication> daily = meds.findAll().stream().filter(Medication::isScheduledDaily).toList();
        Random rnd = new Random(42);
        LocalDate start = LocalDate.now().minusDays(60);
        for (LocalDate d = start; d.isBefore(LocalDate.now()); d = d.plusDays(1)) {
            long sinceStart = ChronoUnit.DAYS.between(d, LocalDate.now());
            boolean perfectRun = sinceStart <= 12; // current 12-day streak
            for (Medication m : daily) {
                boolean taken = perfectRun || rnd.nextInt(100) < 91;
                LocalDateTime at = LocalDateTime.of(d, LocalTime.parse(m.getTime())).plusMinutes(rnd.nextInt(35));
                doses.save(new DoseLog(m.getId(), m.getName(), m.getDosage(), d, m.getTime(),
                        taken ? "TAKEN" : "MISSED", at));
            }
        }

        // Today: first two doses already taken.
        markSeedTaken("Lisinopril");
        markSeedTaken("Metformin");

        appState.save(new AppState(1L, LocalDate.now(), 12, 21));

        logActivity("Lisinopril 10mg taken", "Taken");
        logActivity("Daily blood pressure logged", "Logged");
        logActivity("Metformin 500mg taken", "Taken");

        health.save(new HealthEntry("bp", "120/80", "mmHg", "Morning reading", LocalDateTime.now().minusHours(2)));
        health.save(new HealthEntry("weight", "70.2", "kg", null, LocalDateTime.now().minusDays(1)));
        health.save(new HealthEntry("mood", "8", "/10", "Feeling good", LocalDateTime.now().minusDays(1)));

        achievements.save(new AchievementRecord("STREAK_7", LocalDateTime.now().minusDays(5)));
    }

    private void seedMed(String name, String dosage, String time, String frequency, String instructions,
                         String category, String color, String doctor, String pharmacy, String rx,
                         Integer pills, boolean withFood, boolean beforeBed, boolean takenToday) {
        Medication m = new Medication();
        m.setName(name);
        m.setDosage(dosage);
        m.setTime(time);
        m.setFrequency(frequency);
        m.setInstructions(instructions);
        m.setCategory(category);
        m.setColor(color);
        m.setDoctor(doctor);
        m.setPharmacy(pharmacy);
        m.setRxNumber(rx);
        m.setPillsRemaining(pills);
        m.setPillsPerDose(pills == null ? null : 1);
        m.setWithFood(withFood);
        m.setBeforeBed(beforeBed);
        m.setStartDate(LocalDate.now().minusDays(60));
        meds.save(m);
    }

    private void markSeedTaken(String name) {
        meds.findAll().stream().filter(m -> m.getName().equals(name)).findFirst().ifPresent(m -> {
            m.setTaken(true);
            m.setTakenAt(LocalDateTime.of(LocalDate.now(), LocalTime.parse(m.getTime())).plusMinutes(4));
            doses.save(new DoseLog(m.getId(), m.getName(), m.getDosage(), LocalDate.now(), m.getTime(), "TAKEN", m.getTakenAt()));
            meds.save(m);
        });
    }

    // ==================== Day rollover ====================

    private AppState state() {
        return appState.findById(1L).orElseGet(() -> appState.save(new AppState(1L, LocalDate.now(), 0, 0)));
    }

    private void rolloverIfNewDay() {
        AppState st = state();
        LocalDate today = LocalDate.now();
        if (today.equals(st.getCurrentDay())) {
            return;
        }
        List<Medication> daily = meds.findAll().stream().filter(Medication::isScheduledDaily).toList();
        // Archive every skipped day up to yesterday (multi-day gaps count as missed).
        for (LocalDate d = st.getCurrentDay(); d.isBefore(today); d = d.plusDays(1)) {
            int takenCount = 0;
            for (Medication m : daily) {
                Optional<DoseLog> existing = doses.findFirstByMedicationIdAndDate(m.getId(), d);
                if (existing.isPresent()) {
                    if ("TAKEN".equals(existing.get().getStatus())) takenCount++;
                    continue;
                }
                boolean taken = d.equals(st.getCurrentDay()) && m.isTaken();
                doses.save(new DoseLog(m.getId(), m.getName(), m.getDosage(), d, m.getTime(),
                        taken ? "TAKEN" : "MISSED", taken ? m.getTakenAt() : LocalDateTime.of(d, LocalTime.MAX.withNano(0))));
                if (taken) takenCount++;
            }
            int newStreak = (!daily.isEmpty() && takenCount == daily.size()) ? st.getStreak() + 1 : 0;
            st.setStreak(newStreak);
            st.setLongestStreak(Math.max(st.getLongestStreak(), newStreak));
        }
        meds.findAll().forEach(m -> {
            m.setTaken(false);
            m.setTakenAt(null);
            meds.save(m);
        });
        st.setCurrentDay(today);
        appState.save(st);
    }

    // ==================== CRUD ====================

    public List<Medication> findAll() {
        rolloverIfNewDay();
        return meds.findAll().stream()
                .sorted(Comparator
                        .comparing((Medication m) -> !m.isScheduledDaily())
                        .thenComparing(m -> m.getTime() == null || m.getTime().isBlank() ? "99:99" : m.getTime())
                        .thenComparing(Medication::getName))
                .toList();
    }

    public Optional<Medication> findById(long id) {
        rolloverIfNewDay();
        return meds.findById(id);
    }

    public Medication create(Medication med) {
        rolloverIfNewDay();
        med.setId(null);
        med.setTaken(false);
        med.setTakenAt(null);
        if (med.getFrequency() == null || med.getFrequency().isBlank()) {
            med.setFrequency("Daily");
        }
        if (med.getStartDate() == null) {
            med.setStartDate(LocalDate.now());
        }
        Medication saved = meds.save(med);
        logActivity(saved.getName() + " " + saved.getDosage() + " added", "Added");
        return saved;
    }

    public Optional<Medication> update(long id, Medication changes) {
        rolloverIfNewDay();
        return meds.findById(id).map(med -> {
            med.setName(changes.getName());
            med.setDosage(changes.getDosage());
            med.setTime(changes.getTime());
            med.setFrequency(changes.getFrequency());
            med.setInstructions(changes.getInstructions());
            med.setCategory(changes.getCategory());
            med.setColor(changes.getColor());
            med.setNotes(changes.getNotes());
            med.setDoctor(changes.getDoctor());
            med.setPharmacy(changes.getPharmacy());
            med.setRxNumber(changes.getRxNumber());
            med.setStartDate(changes.getStartDate());
            med.setEndDate(changes.getEndDate());
            med.setWithFood(changes.isWithFood());
            med.setBeforeBed(changes.isBeforeBed());
            med.setPillsRemaining(changes.getPillsRemaining());
            med.setPillsPerDose(changes.getPillsPerDose());
            meds.save(med);
            logActivity(med.getName() + " " + med.getDosage() + " updated", "Updated");
            return med;
        });
    }

    public boolean delete(long id) {
        rolloverIfNewDay();
        Optional<Medication> med = meds.findById(id);
        if (med.isEmpty()) {
            return false;
        }
        meds.deleteById(id);
        logActivity(med.get().getName() + " " + med.get().getDosage() + " removed", "Deleted");
        return true;
    }

    // ==================== Dose actions ====================

    public Optional<Medication> setTaken(long id, boolean taken) {
        rolloverIfNewDay();
        return meds.findById(id).map(med -> {
            if (med.isTaken() == taken) {
                return med;
            }
            med.setTaken(taken);
            med.setTakenAt(taken ? LocalDateTime.now() : null);
            doses.deleteByMedicationIdAndDate(id, LocalDate.now());
            int perDose = med.getPillsPerDose() == null || med.getPillsPerDose() < 1 ? 1 : med.getPillsPerDose();
            if (taken) {
                doses.save(new DoseLog(id, med.getName(), med.getDosage(), LocalDate.now(), med.getTime(), "TAKEN", LocalDateTime.now()));
                if (med.getPillsRemaining() != null) {
                    med.setPillsRemaining(Math.max(0, med.getPillsRemaining() - perDose));
                }
            } else if (med.getPillsRemaining() != null) {
                med.setPillsRemaining(med.getPillsRemaining() + perDose);
            }
            meds.save(med);
            logActivity(med.getName() + " " + med.getDosage() + (taken ? " taken" : " marked not taken"),
                    taken ? "Taken" : "Skipped");
            if (taken) {
                checkAchievements();
            }
            return med;
        });
    }

    public Optional<Medication> skipToday(long id) {
        rolloverIfNewDay();
        return meds.findById(id).map(med -> {
            med.setTaken(false);
            med.setTakenAt(null);
            doses.deleteByMedicationIdAndDate(id, LocalDate.now());
            doses.save(new DoseLog(id, med.getName(), med.getDosage(), LocalDate.now(), med.getTime(), "SKIPPED", LocalDateTime.now()));
            meds.save(med);
            logActivity(med.getName() + " " + med.getDosage() + " skipped today", "Skipped");
            return med;
        });
    }

    // ==================== Activity + health ====================

    public List<ActivityEvent> recentActivity() {
        rolloverIfNewDay();
        return activities.findTop20ByOrderByAtDesc();
    }

    public void logActivity(String message, String tag) {
        activities.save(new ActivityEvent(message, tag, LocalDateTime.now()));
    }

    public List<HealthEntry> healthEntries() {
        return health.findTop100ByOrderByAtDesc();
    }

    public HealthEntry addHealth(HealthEntry e) {
        e.setId(null);
        if (e.getAt() == null) {
            e.setAt(LocalDateTime.now());
        }
        HealthEntry saved = health.save(e);
        logActivity(labelForHealth(e), "Logged");
        return saved;
    }

    public boolean deleteHealth(long id) {
        if (!health.existsById(id)) return false;
        health.deleteById(id);
        return true;
    }

    private String labelForHealth(HealthEntry e) {
        Map<String, String> names = Map.of(
                "bp", "Blood pressure", "sugar", "Blood sugar", "weight", "Weight", "heart", "Heart rate",
                "mood", "Mood", "sleep", "Sleep", "water", "Water intake", "symptom", "Symptom");
        String label = names.getOrDefault(e.getType(), "Health data");
        return label + " logged: " + e.getValue() + (e.getUnit() == null || e.getUnit().isBlank() ? "" : " " + e.getUnit());
    }

    // ==================== Missed / refills (live) ====================

    /** Daily meds whose time passed more than the grace period today, untaken and not skipped. */
    public List<Medication> missedToday() {
        LocalTime now = LocalTime.now();
        return meds.findAll().stream()
                .filter(Medication::isScheduledDaily)
                .filter(m -> !m.isTaken())
                .filter(m -> LocalTime.parse(m.getTime()).plusMinutes(MISSED_GRACE_MINUTES).isBefore(now))
                .filter(m -> doses.findFirstByMedicationIdAndDate(m.getId(), LocalDate.now())
                        .map(d -> !"SKIPPED".equals(d.getStatus())).orElse(true))
                .toList();
    }

    public List<Map<String, Object>> refillAlerts() {
        List<Map<String, Object>> alerts = new ArrayList<>();
        for (Medication m : meds.findAll()) {
            if (m.getPillsRemaining() == null || m.pillsPerDay() <= 0) continue;
            int daysLeft = (int) Math.floor(m.getPillsRemaining() / m.pillsPerDay());
            if (daysLeft <= 10) {
                Map<String, Object> a = new LinkedHashMap<>();
                a.put("id", m.getId());
                a.put("name", m.getName());
                a.put("dosage", m.getDosage());
                a.put("pillsRemaining", m.getPillsRemaining());
                a.put("daysLeft", daysLeft);
                a.put("refillDate", LocalDate.now().plusDays(daysLeft).toString());
                a.put("pharmacy", m.getPharmacy());
                alerts.add(a);
            }
        }
        alerts.sort(Comparator.comparingInt(a -> (int) a.get("daysLeft")));
        return alerts;
    }

    // ==================== Stats ====================

    public Map<String, Object> stats() {
        rolloverIfNewDay();
        List<Medication> daily = meds.findAll().stream()
                .filter(Medication::isScheduledDaily)
                .sorted(Comparator.comparing(Medication::getTime))
                .toList();

        int todayTotal = daily.size();
        int todayTaken = (int) daily.stream().filter(Medication::isTaken).count();

        LocalTime now = LocalTime.now();
        Medication next = daily.stream()
                .filter(m -> !m.isTaken() && !LocalTime.parse(m.getTime()).isBefore(now))
                .findFirst()
                .orElseGet(() -> daily.stream().filter(m -> !m.isTaken()).findFirst().orElse(null));

        int[] month = adherenceBetween(LocalDate.now().minusDays(30), LocalDate.now().minusDays(1));
        int taken30 = month[0] + todayTaken;
        int total30 = month[1] + todayTotal;
        int adherenceRate = total30 == 0 ? 100 : Math.round(100f * taken30 / total30);

        AppState st = state();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("todayTaken", todayTaken);
        out.put("todayTotal", todayTotal);
        out.put("nextDoseName", next == null ? null : next.getName() + " " + next.getDosage());
        out.put("nextDoseTime", next == null ? null : next.getTime());
        out.put("totalMedications", meds.count());
        out.put("adherenceRate", adherenceRate);
        out.put("streak", st.getStreak());
        out.put("longestStreak", st.getLongestStreak());
        out.put("monthTaken", taken30);
        out.put("monthTotal", total30);
        out.put("missedToday", missedToday().stream().map(m -> m.getName() + " " + m.getDosage()).toList());
        out.put("refillAlerts", refillAlerts());
        return out;
    }

    /** [taken, taken+missed] between two dates inclusive, from the dose log. */
    private int[] adherenceBetween(LocalDate from, LocalDate to) {
        int taken = 0, total = 0;
        for (DoseLog d : doses.findByDateBetween(from, to)) {
            if ("TAKEN".equals(d.getStatus())) { taken++; total++; }
            else if ("MISSED".equals(d.getStatus())) { total++; }
        }
        return new int[]{taken, total};
    }

    public List<Map<String, Object>> adherenceSeries(int days) {
        rolloverIfNewDay();
        List<Map<String, Object>> series = new ArrayList<>();
        LocalDate start = LocalDate.now().minusDays(days - 1L);
        Map<LocalDate, int[]> byDay = new HashMap<>();
        for (DoseLog d : doses.findByDateBetween(start, LocalDate.now())) {
            int[] rec = byDay.computeIfAbsent(d.getDate(), k -> new int[2]);
            if ("TAKEN".equals(d.getStatus())) { rec[0]++; rec[1]++; }
            else if ("MISSED".equals(d.getStatus())) { rec[1]++; }
        }
        for (int i = 0; i < days; i++) {
            LocalDate d = start.plusDays(i);
            Integer pct;
            if (d.equals(LocalDate.now())) {
                List<Medication> daily = meds.findAll().stream().filter(Medication::isScheduledDaily).toList();
                pct = daily.isEmpty() ? null
                        : Math.round(100f * (int) daily.stream().filter(Medication::isTaken).count() / daily.size());
            } else {
                int[] rec = byDay.get(d);
                pct = rec == null || rec[1] == 0 ? null : Math.round(100f * rec[0] / rec[1]);
            }
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", d.toString());
            point.put("percent", pct);
            series.add(point);
        }
        return series;
    }

    // ==================== Analytics ====================

    public Map<String, Object> analytics(int days) {
        rolloverIfNewDay();
        LocalDate start = LocalDate.now().minusDays(days - 1L);
        List<DoseLog> logs = doses.findByDateBetween(start, LocalDate.now());

        List<Map<String, Object>> daily = adherenceSeries(days);

        // Weekly buckets (week starting Monday)
        Map<LocalDate, int[]> weekly = new LinkedHashMap<>();
        Map<String, int[]> monthly = new LinkedHashMap<>();
        Map<String, int[]> perMed = new LinkedHashMap<>();
        long delaySum = 0, delayCount = 0;
        int taken = 0, missed = 0, skipped = 0;

        for (DoseLog d : logs) {
            LocalDate weekStart = d.getDate().minusDays((d.getDate().getDayOfWeek().getValue() + 6) % 7);
            String monthKey = d.getDate().getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + d.getDate().getYear();
            int[] w = weekly.computeIfAbsent(weekStart, k -> new int[2]);
            int[] mo = monthly.computeIfAbsent(monthKey, k -> new int[2]);
            int[] pm = perMed.computeIfAbsent(d.getMedName(), k -> new int[3]); // taken, missed, skipped
            switch (d.getStatus()) {
                case "TAKEN" -> {
                    w[0]++; w[1]++; mo[0]++; mo[1]++; pm[0]++; taken++;
                    if (d.getTime() != null && !d.getTime().isBlank() && d.getAt() != null) {
                        long mins = Duration.between(LocalDateTime.of(d.getDate(), LocalTime.parse(d.getTime())), d.getAt()).toMinutes();
                        if (mins >= 0 && mins < 24 * 60) { delaySum += mins; delayCount++; }
                    }
                }
                case "MISSED" -> { w[1]++; mo[1]++; pm[1]++; missed++; }
                case "SKIPPED" -> { pm[2]++; skipped++; }
            }
        }

        List<Map<String, Object>> weeklyOut = weekly.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("weekStart", e.getKey().toString());
                    m.put("percent", e.getValue()[1] == 0 ? null : Math.round(100f * e.getValue()[0] / e.getValue()[1]));
                    return m;
                }).toList();

        List<Map<String, Object>> monthlyOut = monthly.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("month", e.getKey());
                    m.put("percent", e.getValue()[1] == 0 ? null : Math.round(100f * e.getValue()[0] / e.getValue()[1]));
                    return m;
                }).toList();

        List<Map<String, Object>> perMedOut = perMed.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    int t = e.getValue()[0], mi = e.getValue()[1];
                    m.put("name", e.getKey());
                    m.put("taken", t);
                    m.put("missed", mi);
                    m.put("skipped", e.getValue()[2]);
                    m.put("adherence", t + mi == 0 ? null : Math.round(100f * t / (t + mi)));
                    return m;
                })
                .sorted(Comparator.comparingInt(m -> -(int) ((Map<String, Object>) m).get("missed")))
                .toList();

        AppState st = state();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("daily", daily);
        out.put("weekly", weeklyOut);
        out.put("monthly", monthlyOut);
        out.put("perMed", perMedOut);
        out.put("taken", taken);
        out.put("missed", missed);
        out.put("skipped", skipped);
        out.put("avgDelayMinutes", delayCount == 0 ? null : Math.round((float) delaySum / delayCount));
        out.put("mostMissed", perMedOut.isEmpty() || (int) perMedOut.get(0).get("missed") == 0 ? null : perMedOut.get(0).get("name"));
        out.put("currentStreak", st.getStreak());
        out.put("longestStreak", st.getLongestStreak());
        out.put("totalDosesTaken", doses.countByStatus("TAKEN"));
        return out;
    }

    /** Dose history for one calendar day; live statuses when the day is today. */
    public List<Map<String, Object>> dayHistory(LocalDate date) {
        rolloverIfNewDay();
        List<Map<String, Object>> out = new ArrayList<>();
        if (date.equals(LocalDate.now())) {
            LocalTime now = LocalTime.now();
            for (Medication m : meds.findAll().stream().filter(Medication::isScheduledDaily)
                    .sorted(Comparator.comparing(Medication::getTime)).toList()) {
                String status;
                Optional<DoseLog> log = doses.findFirstByMedicationIdAndDate(m.getId(), date);
                if (m.isTaken()) status = "TAKEN";
                else if (log.isPresent() && "SKIPPED".equals(log.get().getStatus())) status = "SKIPPED";
                else if (LocalTime.parse(m.getTime()).plusMinutes(MISSED_GRACE_MINUTES).isBefore(now)) status = "LATE";
                else status = "UPCOMING";
                out.add(doseMap(m.getName(), m.getDosage(), m.getTime(), status, m.getTakenAt()));
            }
        } else {
            doses.findByDate(date).stream()
                    .sorted(Comparator.comparing(d -> d.getTime() == null ? "99:99" : d.getTime()))
                    .forEach(d -> out.add(doseMap(d.getMedName(), d.getDosage(), d.getTime(), d.getStatus(), d.getAt())));
        }
        return out;
    }

    private Map<String, Object> doseMap(String name, String dosage, String time, String status, LocalDateTime at) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("dosage", dosage);
        m.put("time", time);
        m.put("status", status);
        m.put("at", at == null ? null : at.toString());
        return m;
    }

    // ==================== Achievements ====================

    static final Map<String, String[]> ACHIEVEMENT_DEFS = new LinkedHashMap<>() {{
        put("STREAK_7", new String[]{"7-Day Streak", "Took every dose for 7 days in a row", "🔥"});
        put("STREAK_30", new String[]{"30-Day Streak", "A full month of perfect adherence", "🏆"});
        put("DOSES_100", new String[]{"Century Club", "100 medications taken", "💯"});
        put("PERFECT_WEEK", new String[]{"Perfect Week", "100% adherence for the last 7 days", "⭐"});
        put("PERFECT_MONTH", new String[]{"Perfect Month", "100% adherence for the last 30 days", "🌟"});
        put("EARLY_BIRD", new String[]{"Early Bird", "Took 10 doses before 9 AM", "🌅"});
        put("CONSISTENCY_CHAMPION", new String[]{"Consistency Champion", "95%+ adherence over 30 days", "🎯"});
    }};

    public List<Map<String, Object>> achievementList() {
        rolloverIfNewDay();
        Map<String, LocalDateTime> unlocked = new HashMap<>();
        achievements.findAll().forEach(a -> unlocked.put(a.getCode(), a.getUnlockedAt()));
        List<Map<String, Object>> out = new ArrayList<>();
        ACHIEVEMENT_DEFS.forEach((code, def) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("code", code);
            m.put("title", def[0]);
            m.put("description", def[1]);
            m.put("emoji", def[2]);
            m.put("unlockedAt", unlocked.containsKey(code) ? unlocked.get(code).toString() : null);
            out.add(m);
        });
        return out;
    }

    private void checkAchievements() {
        AppState st = state();
        long totalTaken = doses.countByStatus("TAKEN");
        unlockIf("DOSES_100", totalTaken >= 100);
        unlockIf("STREAK_7", st.getStreak() >= 7);
        unlockIf("STREAK_30", st.getStreak() >= 30);
        int[] week = adherenceBetween(LocalDate.now().minusDays(7), LocalDate.now().minusDays(1));
        unlockIf("PERFECT_WEEK", week[1] > 0 && week[0] == week[1]);
        int[] month = adherenceBetween(LocalDate.now().minusDays(30), LocalDate.now().minusDays(1));
        unlockIf("PERFECT_MONTH", month[1] > 0 && month[0] == month[1]);
        unlockIf("CONSISTENCY_CHAMPION", month[1] > 0 && 100f * month[0] / month[1] >= 95f);
        long earlyBird = doses.findByDateBetween(LocalDate.now().minusDays(365), LocalDate.now()).stream()
                .filter(d -> "TAKEN".equals(d.getStatus()) && d.getAt() != null && d.getAt().getHour() < 9)
                .count();
        unlockIf("EARLY_BIRD", earlyBird >= 10);
    }

    private void unlockIf(String code, boolean condition) {
        if (condition && !achievements.existsByCode(code)) {
            achievements.save(new AchievementRecord(code, LocalDateTime.now()));
            String[] def = ACHIEVEMENT_DEFS.get(code);
            logActivity("Achievement unlocked: " + def[2] + " " + def[0], "Achievement");
        }
    }

    // ==================== Notifications ====================

    public List<Map<String, Object>> notifications() {
        rolloverIfNewDay();
        List<Map<String, Object>> out = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (Medication m : missedToday()) {
            out.add(notif("missed", "Missed dose", m.getName() + " " + m.getDosage() + " was due at "
                    + m.getTime() + " and hasn't been taken.", LocalDateTime.of(today, LocalTime.parse(m.getTime()))));
        }
        for (Map<String, Object> r : refillAlerts()) {
            int daysLeft = (int) r.get("daysLeft");
            out.add(notif("refill", "Refill soon: " + r.get("name"),
                    r.get("pillsRemaining") + " pills left — about " + daysLeft + " day" + (daysLeft == 1 ? "" : "s")
                            + " of supply. Estimated refill by " + r.get("refillDate") + ".",
                    LocalDateTime.now().minusMinutes(30)));
        }
        LocalTime now = LocalTime.now();
        meds.findAll().stream()
                .filter(Medication::isScheduledDaily)
                .filter(m -> !m.isTaken())
                .filter(m -> {
                    LocalTime t = LocalTime.parse(m.getTime());
                    return !t.isBefore(now) && t.isBefore(now.plusHours(2));
                })
                .forEach(m -> out.add(notif("upcoming", "Upcoming dose",
                        m.getName() + " " + m.getDosage() + " is due at " + m.getTime() + ".",
                        LocalDateTime.of(today, LocalTime.parse(m.getTime())))));
        achievements.findAll().stream()
                .filter(a -> a.getUnlockedAt() != null && a.getUnlockedAt().isAfter(LocalDateTime.now().minusDays(3)))
                .forEach(a -> {
                    String[] def = ACHIEVEMENT_DEFS.get(a.getCode());
                    if (def != null) {
                        out.add(notif("achievement", "Achievement unlocked " + def[2], def[0] + " — " + def[1] + ".", a.getUnlockedAt()));
                    }
                });
        out.sort((a, b) -> ((String) b.get("at")).compareTo((String) a.get("at")));
        return out;
    }

    private Map<String, Object> notif(String type, String title, String body, LocalDateTime at) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("title", title);
        m.put("body", body);
        m.put("at", at.toString());
        return m;
    }

    // ==================== Export ====================

    public Map<String, Object> exportAll() {
        rolloverIfNewDay();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("exportedAt", LocalDateTime.now().toString());
        out.put("medications", meds.findAll());
        out.put("doseLogs", doses.findAll());
        out.put("healthEntries", health.findAll());
        out.put("activity", activities.findAll());
        out.put("achievements", achievements.findAll());
        return out;
    }
}
