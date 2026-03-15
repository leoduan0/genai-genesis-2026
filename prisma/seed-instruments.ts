// ─── Instrument & Item Data for Step 4a ─────────────────────────────────────
// Sources: Published instrument manuals and validation papers.
//
// Tier 1 (Broad Screening): PHQ-9, GAD-7, PHQ-15, PC-PTSD-5, AUDIT-C, WHO-5
// Tier 2 (Targeted): PCL-5, Y-BOCS, CAPE-42, AUDIT, DAST-10, MDQ, ASRS, SPIN, PQ-16, PHQ-Panic,
//   SPQ-B, AQ-10, CDS-2, PID-5-BF, WI-7, HRS-SR, BDDQ, SCOFF, BEDS-7, PGSI, HCL-32

import type { ContentTag, InstrumentTier } from "../src/generated/prisma/client";

type ItemDef = {
  itemNumber: number;
  text: string;
  responseMin: number;
  responseMax: number;
  responseLabels: string[];
  isReverseCoded?: boolean;
  tags: ContentTag[];
};

type InstrumentDef = {
  name: string;
  fullName: string;
  tier: InstrumentTier;
  itemCount: number;
  responseScale: { min: number; max: number; labels: string[] };
  scaleReliabilityIcc: number | null;
  retestIntervalDays: number | null;
  citation: string;
  items: ItemDef[];
};

// ─── Tier 1: Broad Screening ─────────────────────────────────────────────────

const phq9Labels = ["Not at all", "Several days", "More than half the days", "Nearly every day"];

const PHQ9: InstrumentDef = {
  name: "PHQ-9",
  fullName: "Patient Health Questionnaire-9",
  tier: "BROAD_SCREENING",
  itemCount: 9,
  responseScale: { min: 0, max: 3, labels: phq9Labels },
  scaleReliabilityIcc: 0.84,
  retestIntervalDays: 14,
  citation: "Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606-613.",
  items: [
    { itemNumber: 1, text: "Over the last 2 weeks, how often have you been bothered by having little interest or pleasure in doing things?", responseMin: 0, responseMax: 3, responseLabels: phq9Labels, tags: ["ANHEDONIA"] },
    { itemNumber: 2, text: "Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?", responseMin: 0, responseMax: 3, responseLabels: phq9Labels, tags: ["DEPRESSED_MOOD"] },
    { itemNumber: 3, text: "Over the last 2 weeks, how often have you been bothered by trouble falling or staying asleep, or sleeping too much?", responseMin: 0, responseMax: 3, responseLabels: phq9Labels, tags: ["SLEEP"] },
    { itemNumber: 4, text: "Over the last 2 weeks, how often have you been bothered by feeling tired or having little energy?", responseMin: 0, responseMax: 3, responseLabels: phq9Labels, tags: ["FATIGUE"] },
    { itemNumber: 5, text: "Over the last 2 weeks, how often have you been bothered by poor appetite or overeating?", responseMin: 0, responseMax: 3, responseLabels: phq9Labels, tags: ["APPETITE"] },
    { itemNumber: 6, text: "Over the last 2 weeks, how often have you been bothered by feeling bad about yourself - or that you are a failure or have let yourself or your family down?", responseMin: 0, responseMax: 3, responseLabels: phq9Labels, tags: ["WORTHLESSNESS"] },
    { itemNumber: 7, text: "Over the last 2 weeks, how often have you been bothered by trouble concentrating on things, such as reading the newspaper or watching television?", responseMin: 0, responseMax: 3, responseLabels: phq9Labels, tags: ["CONCENTRATION"] },
    { itemNumber: 8, text: "Over the last 2 weeks, how often have you been bothered by moving or speaking so slowly that other people could have noticed? Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual?", responseMin: 0, responseMax: 3, responseLabels: phq9Labels, tags: ["PSYCHOMOTOR"] },
    { itemNumber: 9, text: "Over the last 2 weeks, how often have you been bothered by thoughts that you would be better off dead, or of hurting yourself in some way?", responseMin: 0, responseMax: 3, responseLabels: phq9Labels, tags: ["SUICIDALITY"] },
  ],
};

const gad7Labels = ["Not at all", "Several days", "More than half the days", "Nearly every day"];

const GAD7: InstrumentDef = {
  name: "GAD-7",
  fullName: "Generalized Anxiety Disorder 7-item Scale",
  tier: "BROAD_SCREENING",
  itemCount: 7,
  responseScale: { min: 0, max: 3, labels: gad7Labels },
  scaleReliabilityIcc: 0.83,
  retestIntervalDays: 14,
  citation: "Spitzer RL, Kroenke K, Williams JB, Lowe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092-1097.",
  items: [
    { itemNumber: 1, text: "Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?", responseMin: 0, responseMax: 3, responseLabels: gad7Labels, tags: ["WORRY", "RESTLESSNESS"] },
    { itemNumber: 2, text: "Over the last 2 weeks, how often have you been bothered by not being able to stop or control worrying?", responseMin: 0, responseMax: 3, responseLabels: gad7Labels, tags: ["WORRY"] },
    { itemNumber: 3, text: "Over the last 2 weeks, how often have you been bothered by worrying too much about different things?", responseMin: 0, responseMax: 3, responseLabels: gad7Labels, tags: ["WORRY"] },
    { itemNumber: 4, text: "Over the last 2 weeks, how often have you been bothered by trouble relaxing?", responseMin: 0, responseMax: 3, responseLabels: gad7Labels, tags: ["RESTLESSNESS", "MUSCLE_TENSION"] },
    { itemNumber: 5, text: "Over the last 2 weeks, how often have you been bothered by being so restless that it is hard to sit still?", responseMin: 0, responseMax: 3, responseLabels: gad7Labels, tags: ["RESTLESSNESS"] },
    { itemNumber: 6, text: "Over the last 2 weeks, how often have you been bothered by becoming easily annoyed or irritable?", responseMin: 0, responseMax: 3, responseLabels: gad7Labels, tags: ["IRRITABILITY"] },
    { itemNumber: 7, text: "Over the last 2 weeks, how often have you been bothered by feeling afraid, as if something awful might happen?", responseMin: 0, responseMax: 3, responseLabels: gad7Labels, tags: ["PANIC", "WORRY"] },
  ],
};

const phq15Labels = ["Not bothered at all", "Bothered a little", "Bothered a lot"];

const PHQ15: InstrumentDef = {
  name: "PHQ-15",
  fullName: "Patient Health Questionnaire-15 (Somatic Symptom Severity)",
  tier: "BROAD_SCREENING",
  itemCount: 15,
  responseScale: { min: 0, max: 2, labels: phq15Labels },
  scaleReliabilityIcc: 0.79,
  retestIntervalDays: 14,
  citation: "Kroenke K, Spitzer RL, Williams JB. The PHQ-15: validity of a new measure for evaluating the severity of somatic symptoms. Psychosom Med. 2002;64(2):258-266.",
  items: [
    { itemNumber: 1, text: "During the past 4 weeks, how much have you been bothered by stomach pain?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_GI"] },
    { itemNumber: 2, text: "During the past 4 weeks, how much have you been bothered by back pain?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_PAIN"] },
    { itemNumber: 3, text: "During the past 4 weeks, how much have you been bothered by pain in your arms, legs, or joints (knees, hips, etc.)?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_PAIN"] },
    { itemNumber: 4, text: "During the past 4 weeks, how much have you been bothered by menstrual cramps or other problems with your periods (women only)?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_PAIN"] },
    { itemNumber: 5, text: "During the past 4 weeks, how much have you been bothered by headaches?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_NEURO"] },
    { itemNumber: 6, text: "During the past 4 weeks, how much have you been bothered by chest pain?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_CARDIO"] },
    { itemNumber: 7, text: "During the past 4 weeks, how much have you been bothered by dizziness?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_NEURO"] },
    { itemNumber: 8, text: "During the past 4 weeks, how much have you been bothered by fainting spells?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_NEURO"] },
    { itemNumber: 9, text: "During the past 4 weeks, how much have you been bothered by feeling your heart pound or race?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_CARDIO", "PANIC"] },
    { itemNumber: 10, text: "During the past 4 weeks, how much have you been bothered by shortness of breath?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_CARDIO", "PANIC"] },
    { itemNumber: 11, text: "During the past 4 weeks, how much have you been bothered by pain or problems during sexual intercourse?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_PAIN"] },
    { itemNumber: 12, text: "During the past 4 weeks, how much have you been bothered by constipation, loose bowels, or diarrhea?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_GI"] },
    { itemNumber: 13, text: "During the past 4 weeks, how much have you been bothered by nausea, gas, or indigestion?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SOMATIC_GI"] },
    { itemNumber: 14, text: "During the past 4 weeks, how much have you been bothered by feeling tired or having low energy?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["FATIGUE"] },
    { itemNumber: 15, text: "During the past 4 weeks, how much have you been bothered by trouble sleeping?", responseMin: 0, responseMax: 2, responseLabels: phq15Labels, tags: ["SLEEP"] },
  ],
};

const pcptsd5Labels = ["No", "Yes"];

const PCPTSD5: InstrumentDef = {
  name: "PC-PTSD-5",
  fullName: "Primary Care PTSD Screen for DSM-5",
  tier: "BROAD_SCREENING",
  itemCount: 5,
  responseScale: { min: 0, max: 1, labels: pcptsd5Labels },
  scaleReliabilityIcc: 0.83,
  retestIntervalDays: 7,
  citation: "Prins A, Bovin MJ, Smolenski DJ, et al. The Primary Care PTSD Screen for DSM-5 (PC-PTSD-5): Development and evaluation within a veteran primary care sample. J Gen Intern Med. 2016;31(10):1206-1211.",
  items: [
    { itemNumber: 1, text: "Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. In the past month, have you had nightmares about the event(s) or thought about the event(s) when you did not want to?", responseMin: 0, responseMax: 1, responseLabels: pcptsd5Labels, tags: ["INTRUSIONS"] },
    { itemNumber: 2, text: "Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. In the past month, have you tried hard not to think about the event(s) or went out of your way to avoid situations that reminded you of the event(s)?", responseMin: 0, responseMax: 1, responseLabels: pcptsd5Labels, tags: ["AVOIDANCE"] },
    { itemNumber: 3, text: "Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. In the past month, have you been constantly on guard, watchful, or easily startled?", responseMin: 0, responseMax: 1, responseLabels: pcptsd5Labels, tags: ["HYPERAROUSAL"] },
    { itemNumber: 4, text: "Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. In the past month, have you felt numb or detached from people, activities, or your surroundings?", responseMin: 0, responseMax: 1, responseLabels: pcptsd5Labels, tags: ["NUMBING", "EMOTIONAL_DETACHMENT"] },
    { itemNumber: 5, text: "Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. In the past month, have you felt guilty or unable to stop blaming yourself or others for the event(s) or any problems the event(s) may have caused?", responseMin: 0, responseMax: 1, responseLabels: pcptsd5Labels, tags: ["WORTHLESSNESS"] },
  ],
};

const auditCLabels0 = ["Never", "Monthly or less", "2-4 times a month", "2-3 times a week", "4 or more times a week"];
const auditCLabels1 = ["1 or 2", "3 or 4", "5 or 6", "7, 8, or 9", "10 or more"];
const auditCLabels2 = ["Never", "Less than monthly", "Monthly", "Weekly", "Daily or almost daily"];

const AUDITC: InstrumentDef = {
  name: "AUDIT-C",
  fullName: "Alcohol Use Disorders Identification Test - Consumption",
  tier: "BROAD_SCREENING",
  itemCount: 3,
  responseScale: { min: 0, max: 4, labels: ["See individual items"] },
  scaleReliabilityIcc: 0.82,
  retestIntervalDays: 14,
  citation: "Bush K, Kivlahan DR, McDonell MB, et al. The AUDIT alcohol consumption questions (AUDIT-C): an effective brief screening test for problem drinking. Arch Intern Med. 1998;158(16):1789-1795.",
  items: [
    { itemNumber: 1, text: "How often do you have a drink containing alcohol?", responseMin: 0, responseMax: 4, responseLabels: auditCLabels0, tags: ["ALCOHOL_USE"] },
    { itemNumber: 2, text: "How many drinks containing alcohol do you have on a typical day when you are drinking?", responseMin: 0, responseMax: 4, responseLabels: auditCLabels1, tags: ["ALCOHOL_USE"] },
    { itemNumber: 3, text: "How often do you have six or more drinks on one occasion?", responseMin: 0, responseMax: 4, responseLabels: auditCLabels2, tags: ["ALCOHOL_USE", "IMPULSIVITY"] },
  ],
};

const who5Labels = ["All of the time", "Most of the time", "More than half of the time", "Less than half of the time", "Some of the time", "At no time"];

const WHO5: InstrumentDef = {
  name: "WHO-5",
  fullName: "WHO-5 Well-Being Index",
  tier: "BROAD_SCREENING",
  itemCount: 5,
  responseScale: { min: 0, max: 5, labels: who5Labels },
  scaleReliabilityIcc: 0.81,
  retestIntervalDays: 14,
  citation: "Topp CW, Ostergaard SD, Sondergaard S, Bech P. The WHO-5 Well-Being Index: a systematic review of the literature. Psychother Psychosom. 2015;84(3):167-176.",
  items: [
    { itemNumber: 1, text: "Over the last 2 weeks, how much do you agree with the following?\nI have felt cheerful and in good spirits", responseMin: 0, responseMax: 5, responseLabels: who5Labels, isReverseCoded: true, tags: ["DEPRESSED_MOOD", "ANHEDONIA"] },
    { itemNumber: 2, text: "Over the last 2 weeks, how much do you agree with the following?\nI have felt calm and relaxed", responseMin: 0, responseMax: 5, responseLabels: who5Labels, isReverseCoded: true, tags: ["WORRY", "RESTLESSNESS"] },
    { itemNumber: 3, text: "Over the last 2 weeks, how much do you agree with the following?\nI have felt active and vigorous", responseMin: 0, responseMax: 5, responseLabels: who5Labels, isReverseCoded: true, tags: ["FATIGUE", "PSYCHOMOTOR"] },
    { itemNumber: 4, text: "Over the last 2 weeks, how much do you agree with the following?\nI woke up feeling fresh and rested", responseMin: 0, responseMax: 5, responseLabels: who5Labels, isReverseCoded: true, tags: ["SLEEP", "FATIGUE"] },
    { itemNumber: 5, text: "Over the last 2 weeks, how much do you agree with the following?\nMy daily life has been filled with things that interest me", responseMin: 0, responseMax: 5, responseLabels: who5Labels, isReverseCoded: true, tags: ["ANHEDONIA"] },
  ],
};

// ─── Tier 2: Targeted Disambiguation ─────────────────────────────────────────

const pcl5Labels = ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"];

const PCL5: InstrumentDef = {
  name: "PCL-5",
  fullName: "PTSD Checklist for DSM-5",
  tier: "TARGETED",
  itemCount: 20,
  responseScale: { min: 0, max: 4, labels: pcl5Labels },
  scaleReliabilityIcc: 0.82,
  retestIntervalDays: 7,
  citation: "Blevins CA, Weathers FW, Davis MT, Witte TK, Domino JL. The Posttraumatic Stress Disorder Checklist for DSM-5 (PCL-5): Development and initial psychometric evaluation. J Trauma Stress. 2015;28(6):489-498.",
  items: [
    // Cluster B: Intrusion (1-5)
    { itemNumber: 1, text: "In the past month, in response to a very stressful experience, how much have you been bothered by repeated, disturbing, and unwanted memories of the stressful experience?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["INTRUSIONS"] },
    { itemNumber: 2, text: "In the past month, in response to a very stressful experience, how much have you been bothered by repeated, disturbing dreams of the stressful experience?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["INTRUSIONS", "SLEEP"] },
    { itemNumber: 3, text: "In the past month, in response to a very stressful experience, how much have you been bothered by suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["FLASHBACKS", "DISSOCIATION"] },
    { itemNumber: 4, text: "In the past month, in response to a very stressful experience, how much have you been bothered by feeling very upset when something reminded you of the stressful experience?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["INTRUSIONS"] },
    { itemNumber: 5, text: "In the past month, in response to a very stressful experience, how much have you been bothered by having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["HYPERAROUSAL", "SOMATIC_CARDIO"] },
    // Cluster C: Avoidance (6-7)
    { itemNumber: 6, text: "In the past month, in response to a very stressful experience, how much have you been bothered by avoiding memories, thoughts, or feelings related to the stressful experience?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["AVOIDANCE"] },
    { itemNumber: 7, text: "In the past month, in response to a very stressful experience, how much have you been bothered by avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["AVOIDANCE"] },
    // Cluster D: Negative cognitions and mood (8-14)
    { itemNumber: 8, text: "In the past month, in response to a very stressful experience, how much have you been bothered by trouble remembering important parts of the stressful experience?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["DISSOCIATION", "CONCENTRATION"] },
    { itemNumber: 9, text: "In the past month, in response to a very stressful experience, how much have you been bothered by having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["WORTHLESSNESS"] },
    { itemNumber: 10, text: "In the past month, in response to a very stressful experience, how much have you been bothered by blaming yourself or someone else for the stressful experience or what happened after it?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["WORTHLESSNESS"] },
    { itemNumber: 11, text: "In the past month, in response to a very stressful experience, how much have you been bothered by having strong negative feelings such as fear, horror, anger, guilt, or shame?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["DEPRESSED_MOOD"] },
    { itemNumber: 12, text: "In the past month, in response to a very stressful experience, how much have you been bothered by loss of interest in activities that you used to enjoy?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["ANHEDONIA"] },
    { itemNumber: 13, text: "In the past month, in response to a very stressful experience, how much have you been bothered by feeling distant or cut off from other people?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["NUMBING", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 14, text: "In the past month, in response to a very stressful experience, how much have you been bothered by trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["NUMBING", "ANHEDONIA"] },
    // Cluster E: Arousal and reactivity (15-20)
    { itemNumber: 15, text: "In the past month, in response to a very stressful experience, how much have you been bothered by irritable behavior, angry outbursts, or acting aggressively?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["IRRITABILITY", "AGGRESSION"] },
    { itemNumber: 16, text: "In the past month, in response to a very stressful experience, how much have you been bothered by taking too many risks or doing things that could cause you harm?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["IMPULSIVITY"] },
    { itemNumber: 17, text: "In the past month, in response to a very stressful experience, how much have you been bothered by being 'superalert' or watchful or on guard?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["HYPERAROUSAL"] },
    { itemNumber: 18, text: "In the past month, in response to a very stressful experience, how much have you been bothered by feeling jumpy or easily startled?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["HYPERAROUSAL"] },
    { itemNumber: 19, text: "In the past month, in response to a very stressful experience, how much have you been bothered by having difficulty concentrating?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["CONCENTRATION"] },
    { itemNumber: 20, text: "In the past month, in response to a very stressful experience, how much have you been bothered by trouble falling or staying asleep?", responseMin: 0, responseMax: 4, responseLabels: pcl5Labels, tags: ["SLEEP"] },
  ],
};

const ybocsLabels = ["None / Not at all", "Mild", "Moderate", "Severe", "Extreme"];

const YBOCS: InstrumentDef = {
  name: "Y-BOCS",
  fullName: "Yale-Brown Obsessive Compulsive Scale",
  tier: "TARGETED",
  itemCount: 10,
  responseScale: { min: 0, max: 4, labels: ybocsLabels },
  scaleReliabilityIcc: 0.85,
  retestIntervalDays: 7,
  citation: "Goodman WK, Price LH, Rasmussen SA, et al. The Yale-Brown Obsessive Compulsive Scale. I. Development, use, and reliability. Arch Gen Psychiatry. 1989;46(11):1006-1011.",
  items: [
    // Obsession subscale (1-5)
    { itemNumber: 1, text: "How much of your time is occupied by obsessive thoughts?", responseMin: 0, responseMax: 4, responseLabels: ["None", "Less than 1 hr/day", "1-3 hrs/day", "3-8 hrs/day", "More than 8 hrs/day"], tags: ["OBSESSIONS"] },
    { itemNumber: 2, text: "How much do your obsessive thoughts interfere with your social or work functioning?", responseMin: 0, responseMax: 4, responseLabels: ybocsLabels, tags: ["OBSESSIONS"] },
    { itemNumber: 3, text: "How much distress do your obsessive thoughts cause you?", responseMin: 0, responseMax: 4, responseLabels: ybocsLabels, tags: ["OBSESSIONS"] },
    { itemNumber: 4, text: "How much of an effort do you make to resist the obsessive thoughts?", responseMin: 0, responseMax: 4, responseLabels: ["Always resist", "Try to resist most of the time", "Make some effort to resist", "Allow all obsessions; rarely resist", "Completely yield to all obsessions"], tags: ["OBSESSIONS"] },
    { itemNumber: 5, text: "How much control do you have over your obsessive thoughts?", responseMin: 0, responseMax: 4, responseLabels: ["Complete control", "Much control", "Moderate control", "Little control", "No control"], tags: ["OBSESSIONS"] },
    // Compulsion subscale (6-10)
    { itemNumber: 6, text: "How much time do you spend performing compulsive behaviors?", responseMin: 0, responseMax: 4, responseLabels: ["None", "Less than 1 hr/day", "1-3 hrs/day", "3-8 hrs/day", "More than 8 hrs/day"], tags: ["COMPULSIONS"] },
    { itemNumber: 7, text: "How much do your compulsive behaviors interfere with your social or work functioning?", responseMin: 0, responseMax: 4, responseLabels: ybocsLabels, tags: ["COMPULSIONS"] },
    { itemNumber: 8, text: "How anxious would you become if prevented from performing your compulsive behaviors?", responseMin: 0, responseMax: 4, responseLabels: ybocsLabels, tags: ["COMPULSIONS"] },
    { itemNumber: 9, text: "How much of an effort do you make to resist the compulsions?", responseMin: 0, responseMax: 4, responseLabels: ["Always resist", "Try to resist most of the time", "Make some effort to resist", "Allow all compulsions; rarely resist", "Completely yield to all compulsions"], tags: ["COMPULSIONS"] },
    { itemNumber: 10, text: "How much control do you have over the compulsive behaviors?", responseMin: 0, responseMax: 4, responseLabels: ["Complete control", "Much control", "Moderate control", "Little control", "No control"], tags: ["COMPULSIONS"] },
  ],
};

const cape42Labels = ["Never", "Sometimes", "Often", "Nearly always"];

const CAPE42: InstrumentDef = {
  name: "CAPE-42",
  fullName: "Community Assessment of Psychic Experiences",
  tier: "TARGETED",
  itemCount: 42,
  responseScale: { min: 0, max: 3, labels: cape42Labels },
  scaleReliabilityIcc: 0.79,
  retestIntervalDays: 14,
  citation: "Stefanis NC, Hanssen M, Smirnis NK, et al. New self-rated measure of psychotic experiences: the Community Assessment of Psychic Experiences (CAPE-42). Schizophr Res. 2002;57(2-3):295.",
  items: [
    // Positive dimension (20 items)
    { itemNumber: 1, text: "Do you ever feel as if people seem to drop hints about you or say things with a double meaning?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["PARANOIA"] },
    { itemNumber: 2, text: "Do you ever feel as if things in magazines or on TV were written especially for you?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DELUSIONS"] },
    { itemNumber: 3, text: "Do you ever feel as if some people are not what they seem to be?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["PARANOIA"] },
    { itemNumber: 4, text: "Do you ever feel as if you are being persecuted in some way?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["PARANOIA"] },
    { itemNumber: 5, text: "Do you ever feel as if there is a conspiracy against you?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["PARANOIA", "DELUSIONS"] },
    { itemNumber: 6, text: "Do you ever feel as if you are destined to be someone very important?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["GRANDIOSITY"] },
    { itemNumber: 7, text: "Do you ever feel as if you are a very special or unusual person?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["GRANDIOSITY"] },
    { itemNumber: 8, text: "Do you ever feel as if there is a special connection between you and electricity?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DELUSIONS"] },
    { itemNumber: 9, text: "Do you ever think that people can communicate telepathically?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DELUSIONS", "DISORGANIZED_THOUGHT"] },
    { itemNumber: 10, text: "Do you ever feel as if electrical devices such as computers can influence the way you think?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DELUSIONS"] },
    { itemNumber: 11, text: "Do you ever feel as if you have been chosen by God in some way?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["GRANDIOSITY", "DELUSIONS"] },
    { itemNumber: 12, text: "Do you believe in the power of witchcraft, voodoo, or the occult?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DELUSIONS"] },
    { itemNumber: 13, text: "Are you often worried that your food or water might be poisoned?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["PARANOIA"] },
    { itemNumber: 14, text: "Do you ever feel as if you are under the control of some force or power other than yourself?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DELUSIONS"] },
    { itemNumber: 15, text: "Do you ever hear voices when you are alone?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["HALLUCINATIONS"] },
    { itemNumber: 16, text: "Do you ever hear voices talking to each other when you are alone?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["HALLUCINATIONS"] },
    { itemNumber: 17, text: "Do you ever feel as if a double has taken the place of a family member, friend, or acquaintance?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DELUSIONS"] },
    { itemNumber: 18, text: "Do you ever see objects, people, or animals that other people cannot see?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["HALLUCINATIONS"] },
    { itemNumber: 19, text: "Do you ever feel as if the thoughts in your head are being taken away from you?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DELUSIONS", "DISORGANIZED_THOUGHT"] },
    { itemNumber: 20, text: "Do you ever feel as if the thoughts in your head are not your own?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DELUSIONS", "DISORGANIZED_THOUGHT"] },
    // Negative dimension (14 items)
    { itemNumber: 21, text: "Do you ever feel as if you are lacking in motivation to do things?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["ANHEDONIA", "FATIGUE"] },
    { itemNumber: 22, text: "Do you ever feel as if you are lacking in emotion, interest, or enthusiasm?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["ANHEDONIA", "EMOTIONAL_DETACHMENT"] },
    { itemNumber: 23, text: "Do you ever feel as if you are spending all your days doing nothing?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["ANHEDONIA", "PSYCHOMOTOR"] },
    { itemNumber: 24, text: "Do you ever feel as if your feelings are lacking in intensity?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["EMOTIONAL_DETACHMENT", "NUMBING"] },
    { itemNumber: 25, text: "Do you ever feel as if your feelings are lacking in quality?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["EMOTIONAL_DETACHMENT", "NUMBING"] },
    { itemNumber: 26, text: "Do you ever feel as if you cannot think clearly?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["CONCENTRATION", "DISORGANIZED_THOUGHT"] },
    { itemNumber: 27, text: "Do you ever feel as if people around you are not who they seem?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["PARANOIA", "DEREALIZATION"] },
    { itemNumber: 28, text: "Do you ever feel as if you are neglecting your appearance or hygiene?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["SOCIAL_WITHDRAWAL"] },
    { itemNumber: 29, text: "Do you ever feel that you cannot close off your thoughts?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DISORGANIZED_THOUGHT"] },
    { itemNumber: 30, text: "Do you ever feel as if your thoughts are confused or mixed up?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DISORGANIZED_THOUGHT"] },
    { itemNumber: 31, text: "Do you ever feel as if your thoughts go too fast?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DISORGANIZED_THOUGHT", "MANIA"] },
    { itemNumber: 32, text: "Do you ever feel as if your mind is blank?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["CONCENTRATION", "DISSOCIATION"] },
    { itemNumber: 33, text: "Do you ever feel as if you have difficulty in paying attention?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["CONCENTRATION", "INATTENTION"] },
    { itemNumber: 34, text: "Do you ever have difficulty remembering everyday things?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["CONCENTRATION"] },
    // Depressive dimension (8 items)
    { itemNumber: 35, text: "Do you ever feel sad?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DEPRESSED_MOOD"] },
    { itemNumber: 36, text: "Do you ever feel as if you are no good?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["WORTHLESSNESS"] },
    { itemNumber: 37, text: "Do you ever feel pessimistic about everything?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DEPRESSED_MOOD"] },
    { itemNumber: 38, text: "Do you ever feel that life is not worth living?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["SUICIDALITY"] },
    { itemNumber: 39, text: "Do you ever cry for no particular reason?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["DEPRESSED_MOOD"] },
    { itemNumber: 40, text: "Do you ever feel guilty?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["WORTHLESSNESS"] },
    { itemNumber: 41, text: "Do you ever feel a failure?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["WORTHLESSNESS"] },
    { itemNumber: 42, text: "Do you ever feel tense?", responseMin: 0, responseMax: 3, responseLabels: cape42Labels, tags: ["RESTLESSNESS", "MUSCLE_TENSION"] },
  ],
};

const auditLabels2to8 = ["Never", "Less than monthly", "Monthly", "Weekly", "Daily or almost daily"];

const AUDIT: InstrumentDef = {
  name: "AUDIT",
  fullName: "Alcohol Use Disorders Identification Test",
  tier: "TARGETED",
  itemCount: 10,
  responseScale: { min: 0, max: 4, labels: ["See individual items"] },
  scaleReliabilityIcc: 0.87,
  retestIntervalDays: 28,
  citation: "Saunders JB, Aasland OG, Babor TF, de la Fuente JR, Grant M. Development of the Alcohol Use Disorders Identification Test (AUDIT): WHO Collaborative Project on Early Detection of Persons with Harmful Alcohol Consumption--II. Addiction. 1993;88(6):791-804.",
  items: [
    { itemNumber: 1, text: "How often do you have a drink containing alcohol?", responseMin: 0, responseMax: 4, responseLabels: auditCLabels0, tags: ["ALCOHOL_USE"] },
    { itemNumber: 2, text: "How many drinks containing alcohol do you have on a typical day when you are drinking?", responseMin: 0, responseMax: 4, responseLabels: auditCLabels1, tags: ["ALCOHOL_USE"] },
    { itemNumber: 3, text: "How often do you have six or more drinks on one occasion?", responseMin: 0, responseMax: 4, responseLabels: auditCLabels2, tags: ["ALCOHOL_USE", "IMPULSIVITY"] },
    { itemNumber: 4, text: "How often during the last year have you found that you were not able to stop drinking once you had started?", responseMin: 0, responseMax: 4, responseLabels: auditLabels2to8, tags: ["ALCOHOL_USE", "IMPULSIVITY"] },
    { itemNumber: 5, text: "How often during the last year have you failed to do what was normally expected of you because of drinking?", responseMin: 0, responseMax: 4, responseLabels: auditLabels2to8, tags: ["ALCOHOL_USE"] },
    { itemNumber: 6, text: "How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?", responseMin: 0, responseMax: 4, responseLabels: auditLabels2to8, tags: ["ALCOHOL_USE"] },
    { itemNumber: 7, text: "How often during the last year have you had a feeling of guilt or remorse after drinking?", responseMin: 0, responseMax: 4, responseLabels: auditLabels2to8, tags: ["ALCOHOL_USE", "WORTHLESSNESS"] },
    { itemNumber: 8, text: "How often during the last year have you been unable to remember what happened the night before because of your drinking?", responseMin: 0, responseMax: 4, responseLabels: auditLabels2to8, tags: ["ALCOHOL_USE"] },
    { itemNumber: 9, text: "Have you or someone else been injured because of your drinking?", responseMin: 0, responseMax: 4, responseLabels: ["No", "", "Yes, but not in the last year", "", "Yes, during the last year"], tags: ["ALCOHOL_USE", "AGGRESSION"] },
    { itemNumber: 10, text: "Has a relative, friend, doctor, or other health care worker been concerned about your drinking or suggested that you cut down?", responseMin: 0, responseMax: 4, responseLabels: ["No", "", "Yes, but not in the last year", "", "Yes, during the last year"], tags: ["ALCOHOL_USE"] },
  ],
};

const dast10Labels = ["No", "Yes"];

const DAST10: InstrumentDef = {
  name: "DAST-10",
  fullName: "Drug Abuse Screening Test - 10 Item",
  tier: "TARGETED",
  itemCount: 10,
  responseScale: { min: 0, max: 1, labels: dast10Labels },
  scaleReliabilityIcc: 0.78,
  retestIntervalDays: 14,
  citation: "Skinner HA. The Drug Abuse Screening Test. Addict Behav. 1982;7(4):363-371.",
  items: [
    { itemNumber: 1, text: "Have you used drugs other than those required for medical reasons?", responseMin: 0, responseMax: 1, responseLabels: dast10Labels, tags: ["DRUG_USE"] },
    { itemNumber: 2, text: "Do you abuse more than one drug at a time?", responseMin: 0, responseMax: 1, responseLabels: dast10Labels, tags: ["DRUG_USE"] },
    { itemNumber: 3, text: "Are you always able to stop using drugs when you want to?", responseMin: 0, responseMax: 1, responseLabels: dast10Labels, isReverseCoded: true, tags: ["DRUG_USE", "IMPULSIVITY"] },
    { itemNumber: 4, text: "Have you had 'blackouts' or 'flashbacks' as a result of drug use?", responseMin: 0, responseMax: 1, responseLabels: dast10Labels, tags: ["DRUG_USE"] },
    { itemNumber: 5, text: "Do you ever feel bad or guilty about your drug use?", responseMin: 0, responseMax: 1, responseLabels: dast10Labels, tags: ["DRUG_USE", "WORTHLESSNESS"] },
    { itemNumber: 6, text: "Does your spouse (or parents) ever complain about your involvement with drugs?", responseMin: 0, responseMax: 1, responseLabels: dast10Labels, tags: ["DRUG_USE"] },
    { itemNumber: 7, text: "Have you neglected your family because of your use of drugs?", responseMin: 0, responseMax: 1, responseLabels: dast10Labels, tags: ["DRUG_USE"] },
    { itemNumber: 8, text: "Have you engaged in illegal activities in order to obtain drugs?", responseMin: 0, responseMax: 1, responseLabels: dast10Labels, tags: ["DRUG_USE", "RULE_BREAKING"] },
    { itemNumber: 9, text: "Have you ever experienced withdrawal symptoms (felt sick) when you stopped taking drugs?", responseMin: 0, responseMax: 1, responseLabels: dast10Labels, tags: ["DRUG_USE"] },
    { itemNumber: 10, text: "Have you had medical problems as a result of your drug use (e.g., memory loss, hepatitis, convulsions, bleeding, etc.)?", responseMin: 0, responseMax: 1, responseLabels: dast10Labels, tags: ["DRUG_USE"] },
  ],
};

const mdqLabels = ["No", "Yes"];

const MDQ: InstrumentDef = {
  name: "MDQ",
  fullName: "Mood Disorder Questionnaire",
  tier: "TARGETED",
  itemCount: 13,
  responseScale: { min: 0, max: 1, labels: mdqLabels },
  scaleReliabilityIcc: 0.78,
  retestIntervalDays: 14,
  citation: "Hirschfeld RM, Williams JB, Spitzer RL, et al. Development and validation of a screening instrument for bipolar spectrum disorder: the Mood Disorder Questionnaire. Am J Psychiatry. 2000;157(11):1873-1875.",
  items: [
    { itemNumber: 1, text: "Has there ever been a period of time when you were not your usual self and you felt so good or so hyper that other people thought you were not your normal self, or you were so hyper that you got into trouble?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["MANIA", "HYPOMANIA"] },
    { itemNumber: 2, text: "Has there ever been a period of time when you were not your usual self and you were so irritable that you shouted at people or started fights or arguments?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["IRRITABILITY", "MANIA"] },
    { itemNumber: 3, text: "Has there ever been a period of time when you were not your usual self and you felt much more self-confident than usual?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["GRANDIOSITY", "MANIA"] },
    { itemNumber: 4, text: "Has there ever been a period of time when you were not your usual self and you got much less sleep than usual and found you didn't really miss it?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["SLEEP", "MANIA"] },
    { itemNumber: 5, text: "Has there ever been a period of time when you were not your usual self and you were much more talkative or spoke much faster than usual?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["MANIA", "HYPOMANIA"] },
    { itemNumber: 6, text: "Has there ever been a period of time when you were not your usual self and thoughts raced through your head or you couldn't slow your mind down?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["MANIA", "DISORGANIZED_THOUGHT"] },
    { itemNumber: 7, text: "Has there ever been a period of time when you were not your usual self and you were so easily distracted by things around you that you had trouble concentrating or staying on track?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["CONCENTRATION", "INATTENTION", "MANIA"] },
    { itemNumber: 8, text: "Has there ever been a period of time when you were not your usual self and you had much more energy than usual?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["MANIA", "HYPOMANIA"] },
    { itemNumber: 9, text: "Has there ever been a period of time when you were not your usual self and you were much more active or did many more things than usual?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["MANIA", "HYPERACTIVITY"] },
    { itemNumber: 10, text: "Has there ever been a period of time when you were not your usual self and you were much more social or outgoing than usual; for example, you telephoned friends in the middle of the night?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["MANIA", "IMPULSIVITY"] },
    { itemNumber: 11, text: "Has there ever been a period of time when you were not your usual self and you were much more interested in sex than usual?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["MANIA", "IMPULSIVITY"] },
    { itemNumber: 12, text: "Has there ever been a period of time when you were not your usual self and you did things that were unusual for you or that other people might have thought were excessive, foolish, or risky?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["IMPULSIVITY", "MANIA"] },
    { itemNumber: 13, text: "Has there ever been a period of time when you were not your usual self and spending money got you or your family into trouble?", responseMin: 0, responseMax: 1, responseLabels: mdqLabels, tags: ["IMPULSIVITY", "MANIA"] },
  ],
};

const asrsLabels = ["Never", "Rarely", "Sometimes", "Often", "Very often"];

const ASRS: InstrumentDef = {
  name: "ASRS v1.1",
  fullName: "Adult ADHD Self-Report Scale v1.1 Screener",
  tier: "TARGETED",
  itemCount: 6,
  responseScale: { min: 0, max: 4, labels: asrsLabels },
  scaleReliabilityIcc: 0.77,
  retestIntervalDays: 14,
  citation: "Kessler RC, Adler L, Ames M, et al. The World Health Organization Adult ADHD Self-Report Scale (ASRS): a short screening scale for use in the general population. Psychol Med. 2005;35(2):245-256.",
  items: [
    { itemNumber: 1, text: "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?", responseMin: 0, responseMax: 4, responseLabels: asrsLabels, tags: ["INATTENTION"] },
    { itemNumber: 2, text: "How often do you have difficulty getting things in order when you have to do a task that requires organization?", responseMin: 0, responseMax: 4, responseLabels: asrsLabels, tags: ["INATTENTION"] },
    { itemNumber: 3, text: "How often do you have problems remembering appointments or obligations?", responseMin: 0, responseMax: 4, responseLabels: asrsLabels, tags: ["INATTENTION", "CONCENTRATION"] },
    { itemNumber: 4, text: "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?", responseMin: 0, responseMax: 4, responseLabels: asrsLabels, tags: ["INATTENTION", "IMPULSIVITY"] },
    { itemNumber: 5, text: "How often do you fidget or squirm with your hands or feet when you have to sit down for a long period of time?", responseMin: 0, responseMax: 4, responseLabels: asrsLabels, tags: ["HYPERACTIVITY", "RESTLESSNESS"] },
    { itemNumber: 6, text: "How often do you feel overly active and compelled to do things, like you were driven by a motor?", responseMin: 0, responseMax: 4, responseLabels: asrsLabels, tags: ["HYPERACTIVITY"] },
  ],
};

const spinLabels = ["Not at all", "A little bit", "Somewhat", "Very much", "Extremely"];

const SPIN: InstrumentDef = {
  name: "SPIN",
  fullName: "Social Phobia Inventory",
  tier: "TARGETED",
  itemCount: 17,
  responseScale: { min: 0, max: 4, labels: spinLabels },
  scaleReliabilityIcc: 0.86,
  retestIntervalDays: 14,
  citation: "Connor KM, Davidson JR, Churchill LE, et al. Psychometric properties of the Social Phobia Inventory (SPIN). Br J Psychiatry. 2000;176:379-386.",
  items: [
    { itemNumber: 1, text: "I am afraid of people in authority", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 2, text: "I am bothered by blushing in front of people", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["SOMATIC_CARDIO", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 3, text: "Parties and social events scare me", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 4, text: "I avoid talking to people I don't know", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 5, text: "Being criticized scares me a lot", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE"] },
    { itemNumber: 6, text: "Fear of embarrassment causes me to avoid doing things or speaking to people", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 7, text: "Sweating in front of people causes me distress", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["SOMATIC_CARDIO", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 8, text: "I avoid going to parties", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 9, text: "I avoid activities in which I am the center of attention", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 10, text: "Talking to strangers scares me", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 11, text: "I avoid having to give speeches", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 12, text: "I would do anything to avoid being criticized", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE"] },
    { itemNumber: 13, text: "Heart palpitations bother me when I am around people", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["SOMATIC_CARDIO", "PANIC", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 14, text: "I am afraid of doing things when people might be watching", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 15, text: "Being embarrassed or looking stupid are among my worst fears", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE"] },
    { itemNumber: 16, text: "I avoid speaking to anyone in authority", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["AVOIDANCE", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 17, text: "Trembling or shaking in front of others is distressing to me", responseMin: 0, responseMax: 4, responseLabels: spinLabels, tags: ["SOMATIC_NEURO", "SOCIAL_WITHDRAWAL"] },
  ],
};

const pq16Labels = ["False", "True"];

const PQ16: InstrumentDef = {
  name: "PQ-16",
  fullName: "Prodromal Questionnaire - 16 Item",
  tier: "TARGETED",
  itemCount: 16,
  responseScale: { min: 0, max: 1, labels: pq16Labels },
  scaleReliabilityIcc: 0.74,
  retestIntervalDays: 14,
  citation: "Ising HK, Veling W, Loewy RL, et al. The validity of the 16-item version of the Prodromal Questionnaire (PQ-16) to screen for ultra high risk of developing psychosis in the general help-seeking population. Schizophr Bull. 2012;38(6):1288-1296.",
  items: [
    { itemNumber: 1, text: "I feel uninterested in the things I used to enjoy", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["ANHEDONIA"] },
    { itemNumber: 2, text: "I often seem to live through events exactly as they happened before (deja vu)", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["DEREALIZATION"] },
    { itemNumber: 3, text: "I sometimes smell or taste things that other people can't smell or taste", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["HALLUCINATIONS"] },
    { itemNumber: 4, text: "I often hear unusual sounds like banging, clicking, hissing, clapping, or ringing in my ears", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["HALLUCINATIONS"] },
    { itemNumber: 5, text: "I have had the experience of seeing things other people apparently can't see", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["HALLUCINATIONS"] },
    { itemNumber: 6, text: "I have been confused at times whether something I experienced was real or imaginary", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["DEREALIZATION", "DISSOCIATION"] },
    { itemNumber: 7, text: "When I look at a person, or look at myself in a mirror, I have seen the face change right before my eyes", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["HALLUCINATIONS", "DEPERSONALIZATION"] },
    { itemNumber: 8, text: "I have had experiences with the supernatural", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["DELUSIONS"] },
    { itemNumber: 9, text: "I have had the momentary feeling that I may not be human", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["DEPERSONALIZATION", "DELUSIONS"] },
    { itemNumber: 10, text: "I have felt that there are odd or unusual things going on that I can't explain", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["PARANOIA"] },
    { itemNumber: 11, text: "I have felt that everyday things seem abnormal to me", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["DEREALIZATION"] },
    { itemNumber: 12, text: "I have felt like I am not in control of my own ideas or thoughts", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["DELUSIONS", "DISORGANIZED_THOUGHT"] },
    { itemNumber: 13, text: "I hear things other people can't hear like voices of people whispering or talking", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["HALLUCINATIONS"] },
    { itemNumber: 14, text: "I am an unusually important person", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["GRANDIOSITY"] },
    { itemNumber: 15, text: "I feel that parts of my body have changed in some way, or that parts of my body are working differently than before", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["SOMATIC_NEURO", "DEPERSONALIZATION"] },
    { itemNumber: 16, text: "I have thought that it might be possible that other people can read my mind, or that I can read other people's minds", responseMin: 0, responseMax: 1, responseLabels: pq16Labels, tags: ["DELUSIONS"] },
  ],
};

const phqPanicLabels = ["No", "Yes"];

const PHQPanic: InstrumentDef = {
  name: "PHQ-Panic",
  fullName: "Patient Health Questionnaire - Panic Disorder Module",
  tier: "TARGETED",
  itemCount: 15,
  responseScale: { min: 0, max: 1, labels: phqPanicLabels },
  scaleReliabilityIcc: 0.81,
  retestIntervalDays: 14,
  citation: "Spitzer RL, Kroenke K, Williams JB. Validation and utility of a self-report version of PRIME-MD: the PHQ primary care study. JAMA. 1999;282(18):1737-1744.",
  items: [
    { itemNumber: 1, text: "In the last 4 weeks, have you had an anxiety attack - suddenly feeling fear or panic?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC"] },
    { itemNumber: 2, text: "Has this ever happened before?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC"] },
    { itemNumber: 3, text: "Do some of these attacks come suddenly out of the blue - that is, in situations where you don't expect to be nervous or uncomfortable?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC"] },
    { itemNumber: 4, text: "Do these attacks bother you a lot or are you worried about having another attack?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "WORRY"] },
    { itemNumber: 5, text: "During your most recent panic or anxiety attack, were you short of breath?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "SOMATIC_CARDIO"] },
    { itemNumber: 6, text: "During your most recent panic or anxiety attack, did your heart race, pound, or skip?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "SOMATIC_CARDIO"] },
    { itemNumber: 7, text: "During your most recent panic or anxiety attack, did you have chest pain or pressure?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "SOMATIC_CARDIO"] },
    { itemNumber: 8, text: "During your most recent panic or anxiety attack, did you sweat?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "SOMATIC_CARDIO"] },
    { itemNumber: 9, text: "During your most recent panic or anxiety attack, did you feel as if you were choking?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "SOMATIC_CARDIO"] },
    { itemNumber: 10, text: "During your most recent panic or anxiety attack, did you have hot flashes or chills?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "SOMATIC_NEURO"] },
    { itemNumber: 11, text: "During your most recent panic or anxiety attack, did you have nausea or an upset stomach, or the feeling that you were going to have diarrhea?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "SOMATIC_GI"] },
    { itemNumber: 12, text: "During your most recent panic or anxiety attack, did you feel dizzy, unsteady, or faint?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "SOMATIC_NEURO"] },
    { itemNumber: 13, text: "During your most recent panic or anxiety attack, did you have tingling or numbness in parts of your body?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "SOMATIC_NEURO"] },
    { itemNumber: 14, text: "During your most recent panic or anxiety attack, did you tremble or shake?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "SOMATIC_NEURO"] },
    { itemNumber: 15, text: "During your most recent panic or anxiety attack, were you afraid you were dying or going to lose control or go crazy?", responseMin: 0, responseMax: 1, responseLabels: phqPanicLabels, tags: ["PANIC", "DEPERSONALIZATION"] },
  ],
};

// ─── Gap-Filling Instruments (Tier 2) ────────────────────────────────────────

const spqbLabels = ["No", "Yes"];

const SPQB: InstrumentDef = {
  name: "SPQ-B",
  fullName: "Schizotypal Personality Questionnaire - Brief",
  tier: "TARGETED",
  itemCount: 22,
  responseScale: { min: 0, max: 1, labels: spqbLabels },
  scaleReliabilityIcc: 0.82,
  retestIntervalDays: 14,
  citation: "Raine A, Benishay D. The SPQ-B: a brief screening instrument for schizotypal personality disorder. J Pers Disord. 1995;9(4):346-355.",
  items: [
    { itemNumber: 1, text: "People sometimes find me aloof and distant", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["SOCIAL_WITHDRAWAL", "EMOTIONAL_DETACHMENT"] },
    { itemNumber: 2, text: "Have you ever had the sense that some person or force is around you, even though you cannot see anyone?", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["HALLUCINATIONS", "MAGICAL_THINKING"] },
    { itemNumber: 3, text: "People sometimes comment on my unusual mannerisms and habits", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["ECCENTRIC_BEHAVIOR"] },
    { itemNumber: 4, text: "Are you sometimes sure that other people can tell what you are thinking?", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["PARANOIA", "MAGICAL_THINKING"] },
    { itemNumber: 5, text: "Have you ever noticed a common event or object that seemed to be a special sign for you?", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["MAGICAL_THINKING"] },
    { itemNumber: 6, text: "Some people think that I am a very bizarre person", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["ECCENTRIC_BEHAVIOR"] },
    { itemNumber: 7, text: "I feel I have to be on my guard even with friends", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["PARANOIA", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 8, text: "People find me vague and elusive during a conversation", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["DISORGANIZED_THOUGHT", "ECCENTRIC_BEHAVIOR"] },
    { itemNumber: 9, text: "Do you often pick up hidden threats or put-downs from what people say or do?", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["PARANOIA"] },
    { itemNumber: 10, text: "When shopping, do you get the feeling that other people are taking notice of you?", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["PARANOIA", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 11, text: "I feel very uncomfortable in social situations involving unfamiliar people", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["SOCIAL_WITHDRAWAL", "AVOIDANCE"] },
    { itemNumber: 12, text: "Have you had experiences with astrology, seeing the future, UFOs, ESP, or a sixth sense?", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["MAGICAL_THINKING"] },
    { itemNumber: 13, text: "I sometimes use words in unusual ways", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["DISORGANIZED_THOUGHT", "ECCENTRIC_BEHAVIOR"] },
    { itemNumber: 14, text: "Have you found that it is best not to let other people know too much about you?", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["PARANOIA", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 15, text: "I tend to keep in the background on social occasions", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["SOCIAL_WITHDRAWAL"] },
    { itemNumber: 16, text: "Do you ever suddenly feel distracted by distant sounds that you are not normally aware of?", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["HALLUCINATIONS", "SENSORY_SENSITIVITY"] },
    { itemNumber: 17, text: "Do you often have to keep an eye out to stop people from taking advantage of you?", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["PARANOIA"] },
    { itemNumber: 18, text: "Do you feel that you are unable to get close to people?", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["SOCIAL_WITHDRAWAL", "EMOTIONAL_DETACHMENT"] },
    { itemNumber: 19, text: "I am an odd, unusual person", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["ECCENTRIC_BEHAVIOR"] },
    { itemNumber: 20, text: "I find it hard to communicate clearly what I want to say to people", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["DISORGANIZED_THOUGHT"] },
    { itemNumber: 21, text: "I feel very uneasy talking to people I do not know well", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["SOCIAL_WITHDRAWAL", "AVOIDANCE"] },
    { itemNumber: 22, text: "I tend to keep my feelings to myself", responseMin: 0, responseMax: 1, responseLabels: spqbLabels, tags: ["EMOTIONAL_DETACHMENT"] },
  ],
};

const aq10Labels = ["Definitely agree", "Slightly agree", "Slightly disagree", "Definitely disagree"];

const AQ10: InstrumentDef = {
  name: "AQ-10",
  fullName: "Autism Spectrum Quotient-10",
  tier: "TARGETED",
  itemCount: 10,
  responseScale: { min: 0, max: 3, labels: aq10Labels },
  scaleReliabilityIcc: 0.78,
  retestIntervalDays: 14,
  citation: "Allison C, Auyeung B, Baron-Cohen S. Toward brief 'Red Flags' for autism screening: The Short Autism Spectrum Quotient and the Short Quantitative Checklist for Autism in toddlers in 1,000 cases and 3,000 controls. J Am Acad Child Adolesc Psychiatry. 2012;51(2):202-212.",
  items: [
    { itemNumber: 1, text: "I often notice small sounds when others do not", responseMin: 0, responseMax: 3, responseLabels: aq10Labels, tags: ["SENSORY_SENSITIVITY"] },
    { itemNumber: 2, text: "I usually concentrate more on the whole picture, rather than the small details", responseMin: 0, responseMax: 3, responseLabels: aq10Labels, isReverseCoded: true, tags: ["RIGIDITY", "CONCENTRATION"] },
    { itemNumber: 3, text: "I find it easy to do more than one thing at once", responseMin: 0, responseMax: 3, responseLabels: aq10Labels, isReverseCoded: true, tags: ["RIGIDITY", "CONCENTRATION"] },
    { itemNumber: 4, text: "If there is an interruption, I can switch back to what I was doing very quickly", responseMin: 0, responseMax: 3, responseLabels: aq10Labels, isReverseCoded: true, tags: ["RIGIDITY", "CONCENTRATION"] },
    { itemNumber: 5, text: "I find it easy to 'read between the lines' when someone is talking to me", responseMin: 0, responseMax: 3, responseLabels: aq10Labels, isReverseCoded: true, tags: ["SOCIAL_WITHDRAWAL"] },
    { itemNumber: 6, text: "I know how to tell if someone listening to me is getting bored", responseMin: 0, responseMax: 3, responseLabels: aq10Labels, isReverseCoded: true, tags: ["SOCIAL_WITHDRAWAL"] },
    { itemNumber: 7, text: "When I'm reading a story I find it difficult to work out the characters' intentions", responseMin: 0, responseMax: 3, responseLabels: aq10Labels, tags: ["SOCIAL_WITHDRAWAL", "EMOTIONAL_DETACHMENT"] },
    { itemNumber: 8, text: "I like to collect information about categories of things", responseMin: 0, responseMax: 3, responseLabels: aq10Labels, tags: ["RIGIDITY"] },
    { itemNumber: 9, text: "I find it easy to work out what someone is thinking or feeling just by looking at their face", responseMin: 0, responseMax: 3, responseLabels: aq10Labels, isReverseCoded: true, tags: ["SOCIAL_WITHDRAWAL", "EMOTIONAL_DETACHMENT"] },
    { itemNumber: 10, text: "I find it difficult to work out people's intentions", responseMin: 0, responseMax: 3, responseLabels: aq10Labels, tags: ["SOCIAL_WITHDRAWAL"] },
  ],
};

const cds2Labels = ["Never", "Rarely", "Sometimes", "Often", "All the time"];

const CDS2: InstrumentDef = {
  name: "CDS-2",
  fullName: "Cambridge Depersonalization Scale - 2 Item Screener",
  tier: "TARGETED",
  itemCount: 2,
  responseScale: { min: 0, max: 4, labels: cds2Labels },
  scaleReliabilityIcc: 0.86,
  retestIntervalDays: 14,
  citation: "Sierra M, Berrios GE. The Cambridge Depersonalization Scale: a new instrument for the measurement of depersonalization. Psychiatry Res. 2000;93(2):153-164.",
  items: [
    { itemNumber: 1, text: "Out of the blue, I feel strange, as if I were not real or as if I were cut off from the world", responseMin: 0, responseMax: 4, responseLabels: cds2Labels, tags: ["DEPERSONALIZATION", "DEREALIZATION"] },
    { itemNumber: 2, text: "What I see looks flat or lifeless, as if I were looking at a picture", responseMin: 0, responseMax: 4, responseLabels: cds2Labels, tags: ["DEREALIZATION", "DEPERSONALIZATION"] },
  ],
};

const pid5bfLabels = ["Very false or often false", "Sometimes or somewhat false", "Sometimes or somewhat true", "Very true or often true"];

const PID5BF: InstrumentDef = {
  name: "PID-5-BF",
  fullName: "Personality Inventory for DSM-5 - Brief Form",
  tier: "TARGETED",
  itemCount: 25,
  responseScale: { min: 0, max: 3, labels: pid5bfLabels },
  scaleReliabilityIcc: 0.81,
  retestIntervalDays: 14,
  citation: "Krueger RF, Derringer J, Markon KE, Watson D, Skodol AE. Initial construction of a maladaptive personality trait model and inventory for DSM-5. Psychol Med. 2012;42(9):1879-1890.",
  items: [
    // Negative Affect domain
    { itemNumber: 1, text: "I worry about almost everything", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["WORRY"] },
    { itemNumber: 2, text: "I get emotional over every little thing", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["EMOTIONAL_LABILITY"] },
    { itemNumber: 3, text: "I fear being alone in life more than anything else", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["WORRY", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 4, text: "I get stuck on one way of doing things, even when it's clear it won't work", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["RIGIDITY"] },
    { itemNumber: 5, text: "I get irritated easily by all sorts of things", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["IRRITABILITY"] },
    // Detachment domain
    { itemNumber: 6, text: "I don't like to get too close to people", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["SOCIAL_WITHDRAWAL", "EMOTIONAL_DETACHMENT"] },
    { itemNumber: 7, text: "It's no big deal if I hurt other people's feelings", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["CALLOUSNESS"] },
    { itemNumber: 8, text: "I don't care what happens to me", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["EMOTIONAL_DETACHMENT"] },
    { itemNumber: 9, text: "I steer clear of romantic relationships", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["SOCIAL_WITHDRAWAL", "EMOTIONAL_DETACHMENT"] },
    { itemNumber: 10, text: "I'm not interested in making friends", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["SOCIAL_WITHDRAWAL"] },
    // Antagonism domain
    { itemNumber: 11, text: "I crave attention", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["GRANDIOSITY"] },
    { itemNumber: 12, text: "I often have to deal with people who are less important than me", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["GRANDIOSITY", "MANIPULATIVENESS"] },
    { itemNumber: 13, text: "I use people to get what I want", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["MANIPULATIVENESS"] },
    { itemNumber: 14, text: "It is easy for me to take advantage of others", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["MANIPULATIVENESS", "CALLOUSNESS"] },
    { itemNumber: 15, text: "I'm better than almost everyone else", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["GRANDIOSITY"] },
    // Disinhibition domain
    { itemNumber: 16, text: "I often feel like nothing I do really matters", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["WORTHLESSNESS", "EMOTIONAL_DETACHMENT"] },
    { itemNumber: 17, text: "Others see me as irresponsible", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["IRRESPONSIBILITY"] },
    { itemNumber: 18, text: "I'm not good at planning ahead", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["IRRESPONSIBILITY", "IMPULSIVITY"] },
    { itemNumber: 19, text: "People would describe me as reckless", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["IMPULSIVITY", "RISK_TAKING"] },
    { itemNumber: 20, text: "I feel like I act totally on impulse", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["IMPULSIVITY"] },
    // Psychoticism domain
    { itemNumber: 21, text: "It's weird, but sometimes ordinary objects seem to be a different shape than usual", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["HALLUCINATIONS", "DEREALIZATION"] },
    { itemNumber: 22, text: "I often have unusual experiences, such as sensing the presence of someone who isn't actually there", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["HALLUCINATIONS", "MAGICAL_THINKING"] },
    { itemNumber: 23, text: "I often see vivid dream-like images when I'm falling asleep or waking up", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["HALLUCINATIONS"] },
    { itemNumber: 24, text: "I often 'zone out' and then suddenly come to and realize that a lot of time has passed", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["DISSOCIATION", "DEPERSONALIZATION"] },
    { itemNumber: 25, text: "Things around me often feel unreal, or more real than usual", responseMin: 0, responseMax: 3, responseLabels: pid5bfLabels, tags: ["DEREALIZATION", "DEPERSONALIZATION"] },
  ],
};

const wi7Labels = ["Not at all", "A little bit", "Moderately", "Quite a bit", "A great deal"];

const WI7: InstrumentDef = {
  name: "WI-7",
  fullName: "Whiteley Index-7",
  tier: "TARGETED",
  itemCount: 7,
  responseScale: { min: 0, max: 4, labels: wi7Labels },
  scaleReliabilityIcc: 0.83,
  retestIntervalDays: 14,
  citation: "Pilowsky I. Dimensions of hypochondriasis. Br J Psychiatry. 1967;113(494):89-93.",
  items: [
    { itemNumber: 1, text: "Do you worry a lot about your health?", responseMin: 0, responseMax: 4, responseLabels: wi7Labels, tags: ["HEALTH_ANXIETY", "WORRY"] },
    { itemNumber: 2, text: "Do you think there is something seriously wrong with your body?", responseMin: 0, responseMax: 4, responseLabels: wi7Labels, tags: ["HEALTH_ANXIETY", "SOMATIC_PAIN"] },
    { itemNumber: 3, text: "Is it hard for you to forget about yourself and think about all sorts of other things?", responseMin: 0, responseMax: 4, responseLabels: wi7Labels, tags: ["HEALTH_ANXIETY", "OBSESSIONS"] },
    { itemNumber: 4, text: "If you feel ill and someone tells you that you are looking better, do you become annoyed?", responseMin: 0, responseMax: 4, responseLabels: wi7Labels, tags: ["HEALTH_ANXIETY", "IRRITABILITY"] },
    { itemNumber: 5, text: "Do you often worry about the possibility that you have got a serious illness?", responseMin: 0, responseMax: 4, responseLabels: wi7Labels, tags: ["HEALTH_ANXIETY", "WORRY"] },
    { itemNumber: 6, text: "If a disease is brought to your attention (through the radio, television, newspapers, or someone you know), do you worry about getting it yourself?", responseMin: 0, responseMax: 4, responseLabels: wi7Labels, tags: ["HEALTH_ANXIETY", "WORRY"] },
    { itemNumber: 7, text: "Do you find that you are bothered by many different symptoms?", responseMin: 0, responseMax: 4, responseLabels: wi7Labels, tags: ["HEALTH_ANXIETY", "SOMATIC_PAIN"] },
  ],
};

const hrssrLabels = ["0 - None", "1", "2 - Mild", "3", "4 - Moderate", "5", "6 - Severe", "7", "8 - Extreme"];

const HRSSR: InstrumentDef = {
  name: "HRS-SR",
  fullName: "Hoarding Rating Scale - Self Report",
  tier: "TARGETED",
  itemCount: 5,
  responseScale: { min: 0, max: 8, labels: hrssrLabels },
  scaleReliabilityIcc: 0.84,
  retestIntervalDays: 14,
  citation: "Tolin DF, Frost RO, Steketee G. A brief interview for assessing compulsive hoarding: the Hoarding Rating Scale-Interview. Psychiatry Res. 2010;178(1):147-152.",
  items: [
    { itemNumber: 1, text: "Because of the clutter or number of possessions, how difficult is it for you to use the rooms in your home?", responseMin: 0, responseMax: 8, responseLabels: hrssrLabels, tags: ["HOARDING"] },
    { itemNumber: 2, text: "To what extent do you have difficulty discarding (or recycling, selling, giving away) ordinary things that other people would get rid of?", responseMin: 0, responseMax: 8, responseLabels: hrssrLabels, tags: ["HOARDING", "COMPULSIONS"] },
    { itemNumber: 3, text: "To what extent do you currently have a problem with collecting free things or buying more things than you need or can use or can afford?", responseMin: 0, responseMax: 8, responseLabels: hrssrLabels, tags: ["HOARDING", "IMPULSIVITY"] },
    { itemNumber: 4, text: "To what extent do you experience emotional distress because of clutter, difficulty discarding, or problems with buying or acquiring things?", responseMin: 0, responseMax: 8, responseLabels: hrssrLabels, tags: ["HOARDING", "WORRY"] },
    { itemNumber: 5, text: "To what extent do you experience impairment in your life (daily routine, job/school, social activities, family activities, financial difficulties) because of clutter, difficulty discarding, or problems with buying or acquiring things?", responseMin: 0, responseMax: 8, responseLabels: hrssrLabels, tags: ["HOARDING"] },
  ],
};

const bddqLabels = ["No", "Yes"];

const BDDQ: InstrumentDef = {
  name: "BDDQ",
  fullName: "Body Dysmorphic Disorder Questionnaire",
  tier: "TARGETED",
  itemCount: 4,
  responseScale: { min: 0, max: 1, labels: bddqLabels },
  scaleReliabilityIcc: null,
  retestIntervalDays: null,
  citation: "Phillips KA. The Broken Mirror: Understanding and Treating Body Dysmorphic Disorder. Oxford University Press; 2005.",
  items: [
    { itemNumber: 1, text: "Are you very concerned about the appearance of some part(s) of your body that you consider especially unattractive?", responseMin: 0, responseMax: 1, responseLabels: bddqLabels, tags: ["BODY_IMAGE", "OBSESSIONS"] },
    { itemNumber: 2, text: "Is your main concern with your appearance that you aren't thin enough or that you might become too fat?", responseMin: 0, responseMax: 1, responseLabels: bddqLabels, tags: ["BODY_IMAGE", "WEIGHT"] },
    { itemNumber: 3, text: "How much time do you spend thinking about your appearance defect(s) per day?", responseMin: 0, responseMax: 3, responseLabels: ["Less than 1 hour", "1-3 hours", "3-8 hours", "More than 8 hours"], tags: ["BODY_IMAGE", "OBSESSIONS"] },
    { itemNumber: 4, text: "How much distress do you experience because of your appearance defect(s)?", responseMin: 0, responseMax: 3, responseLabels: ["None/mild", "Moderate", "Severe", "Extreme/disabling"], tags: ["BODY_IMAGE", "OBSESSIONS"] },
  ],
};

const scoffLabels = ["No", "Yes"];

const SCOFF: InstrumentDef = {
  name: "SCOFF",
  fullName: "SCOFF Eating Disorder Screener",
  tier: "TARGETED",
  itemCount: 5,
  responseScale: { min: 0, max: 1, labels: scoffLabels },
  scaleReliabilityIcc: 0.79,
  retestIntervalDays: 14,
  citation: "Morgan JF, Reid F, Lacey JH. The SCOFF questionnaire: assessment of a new screening tool for eating disorders. BMJ. 1999;319(7223):1467-1468.",
  items: [
    { itemNumber: 1, text: "Do you make yourself Sick because you feel uncomfortably full?", responseMin: 0, responseMax: 1, responseLabels: scoffLabels, tags: ["PURGING", "BINGE_EATING"] },
    { itemNumber: 2, text: "Do you worry you have lost Control over how much you eat?", responseMin: 0, responseMax: 1, responseLabels: scoffLabels, tags: ["BINGE_EATING", "IMPULSIVITY"] },
    { itemNumber: 3, text: "Have you recently lost more than One stone (14 pounds / 6.35 kg) in a 3-month period?", responseMin: 0, responseMax: 1, responseLabels: scoffLabels, tags: ["WEIGHT", "RESTRICTED_EATING"] },
    { itemNumber: 4, text: "Do you believe yourself to be Fat when others say you are too thin?", responseMin: 0, responseMax: 1, responseLabels: scoffLabels, tags: ["BODY_IMAGE"] },
    { itemNumber: 5, text: "Would you say that Food dominates your life?", responseMin: 0, responseMax: 1, responseLabels: scoffLabels, tags: ["OBSESSIONS", "RESTRICTED_EATING", "BINGE_EATING"] },
  ],
};

const beds7Labels = ["Never", "Rarely", "Sometimes", "Often", "Always"];

const BEDS7: InstrumentDef = {
  name: "BEDS-7",
  fullName: "Binge Eating Disorder Screener-7",
  tier: "TARGETED",
  itemCount: 7,
  responseScale: { min: 0, max: 4, labels: beds7Labels },
  scaleReliabilityIcc: 0.87,
  retestIntervalDays: 14,
  citation: "Herman BK, Deal LS, DiBenedetti DB, Nelson L, Fehnel SE, Brown TM. Development of the 7-Item Binge-Eating Disorder Screener (BEDS-7). Prim Care Companion CNS Disord. 2016;18(2).",
  items: [
    { itemNumber: 1, text: "During the past 3 months, did you have any episodes of excessive overeating (i.e., eating significantly more than what most people would eat in a similar period of time)?", responseMin: 0, responseMax: 4, responseLabels: beds7Labels, tags: ["BINGE_EATING"] },
    { itemNumber: 2, text: "During the times when you ate an unusually large amount of food, did you feel that your eating was out of control?", responseMin: 0, responseMax: 4, responseLabels: beds7Labels, tags: ["BINGE_EATING", "IMPULSIVITY"] },
    { itemNumber: 3, text: "During the past 3 months, did you often eat much more rapidly than normal?", responseMin: 0, responseMax: 4, responseLabels: beds7Labels, tags: ["BINGE_EATING"] },
    { itemNumber: 4, text: "During the past 3 months, did you often eat until you felt uncomfortably full?", responseMin: 0, responseMax: 4, responseLabels: beds7Labels, tags: ["BINGE_EATING"] },
    { itemNumber: 5, text: "During the past 3 months, did you often eat large amounts of food when you did not feel physically hungry?", responseMin: 0, responseMax: 4, responseLabels: beds7Labels, tags: ["BINGE_EATING"] },
    { itemNumber: 6, text: "During the past 3 months, did you often eat alone because you felt embarrassed by how much you were eating?", responseMin: 0, responseMax: 4, responseLabels: beds7Labels, tags: ["BINGE_EATING", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 7, text: "During the past 3 months, did you feel disgusted with yourself, depressed, or very guilty after overeating?", responseMin: 0, responseMax: 4, responseLabels: beds7Labels, tags: ["BINGE_EATING", "WORTHLESSNESS", "DEPRESSED_MOOD"] },
  ],
};

const pgsiLabels = ["Never", "Sometimes", "Most of the time", "Almost always"];

const PGSI: InstrumentDef = {
  name: "PGSI",
  fullName: "Problem Gambling Severity Index",
  tier: "TARGETED",
  itemCount: 9,
  responseScale: { min: 0, max: 3, labels: pgsiLabels },
  scaleReliabilityIcc: 0.84,
  retestIntervalDays: 30,
  citation: "Ferris J, Wynne H. The Canadian Problem Gambling Index: Final Report. Canadian Centre on Substance Abuse; 2001.",
  items: [
    { itemNumber: 1, text: "Have you bet more than you could really afford to lose?", responseMin: 0, responseMax: 3, responseLabels: pgsiLabels, tags: ["GAMBLING", "RISK_TAKING"] },
    { itemNumber: 2, text: "Have you needed to gamble with larger amounts of money to get the same feeling of excitement?", responseMin: 0, responseMax: 3, responseLabels: pgsiLabels, tags: ["GAMBLING", "IMPULSIVITY"] },
    { itemNumber: 3, text: "When you gambled, did you go back another day to try to win back the money you lost?", responseMin: 0, responseMax: 3, responseLabels: pgsiLabels, tags: ["GAMBLING", "IMPULSIVITY"] },
    { itemNumber: 4, text: "Have you borrowed money or sold anything to get money to gamble?", responseMin: 0, responseMax: 3, responseLabels: pgsiLabels, tags: ["GAMBLING", "RISK_TAKING"] },
    { itemNumber: 5, text: "Have you felt that you might have a problem with gambling?", responseMin: 0, responseMax: 3, responseLabels: pgsiLabels, tags: ["GAMBLING"] },
    { itemNumber: 6, text: "Has gambling caused you any health problems, including stress or anxiety?", responseMin: 0, responseMax: 3, responseLabels: pgsiLabels, tags: ["GAMBLING", "WORRY"] },
    { itemNumber: 7, text: "Have people criticized your betting or told you that you had a gambling problem, regardless of whether or not you thought it was true?", responseMin: 0, responseMax: 3, responseLabels: pgsiLabels, tags: ["GAMBLING"] },
    { itemNumber: 8, text: "Has your gambling caused any financial problems for you or your household?", responseMin: 0, responseMax: 3, responseLabels: pgsiLabels, tags: ["GAMBLING", "RISK_TAKING"] },
    { itemNumber: 9, text: "Have you felt guilty about the way you gamble, or what happens when you gamble?", responseMin: 0, responseMax: 3, responseLabels: pgsiLabels, tags: ["GAMBLING", "WORTHLESSNESS"] },
  ],
};

const hcl32Labels = ["No", "Yes"];

const HCL32: InstrumentDef = {
  name: "HCL-32",
  fullName: "Hypomania Checklist-32",
  tier: "TARGETED",
  itemCount: 32,
  responseScale: { min: 0, max: 1, labels: hcl32Labels },
  scaleReliabilityIcc: 0.77,
  retestIntervalDays: 14,
  citation: "Angst J, Adolfsson R, Benazzi F, et al. The HCL-32: towards a self-assessment tool for hypomanic symptoms in outpatients. J Affect Disord. 2005;88(2):217-233.",
  items: [
    { itemNumber: 1, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI need less sleep", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["SLEEP", "HYPOMANIA"] },
    { itemNumber: 2, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI feel more energetic and more active", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["FATIGUE", "HYPOMANIA"] },
    { itemNumber: 3, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI am more self-confident", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["GRANDIOSITY", "HYPOMANIA"] },
    { itemNumber: 4, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI enjoy my work more", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["ANHEDONIA", "HYPOMANIA"] },
    { itemNumber: 5, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI am more sociable (make more phone calls, go out more)", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["SOCIAL_WITHDRAWAL", "HYPOMANIA"] },
    { itemNumber: 6, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI want to travel and/or do travel more", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA", "RISK_TAKING"] },
    { itemNumber: 7, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI tend to drive faster or take more risks when driving", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["RISK_TAKING", "IMPULSIVITY"] },
    { itemNumber: 8, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI spend more/too much money", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["IMPULSIVITY", "RISK_TAKING"] },
    { itemNumber: 9, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI take more risks in my daily life (in my work and/or other activities)", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["RISK_TAKING", "IMPULSIVITY"] },
    { itemNumber: 10, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI am physically more active (sport etc.)", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPERACTIVITY", "HYPOMANIA"] },
    { itemNumber: 11, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI plan more activities or projects", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA"] },
    { itemNumber: 12, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI have more ideas, I am more creative", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA"] },
    { itemNumber: 13, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI am less shy or inhibited", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 14, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI wear more colorful and more extravagant clothes/make-up", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA", "ECCENTRIC_BEHAVIOR"] },
    { itemNumber: 15, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI want to meet or actually do meet more people", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA", "SOCIAL_WITHDRAWAL"] },
    { itemNumber: 16, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI am more interested in sex, and/or have increased sexual desire", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA", "IMPULSIVITY"] },
    { itemNumber: 17, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI am more flirtatious and/or am more sexually active", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA", "IMPULSIVITY", "RISK_TAKING"] },
    { itemNumber: 18, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI talk more", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["TALKATIVENESS", "HYPOMANIA"] },
    { itemNumber: 19, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI think faster", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA"] },
    { itemNumber: 20, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI make more jokes or puns when I am talking", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["TALKATIVENESS", "HYPOMANIA"] },
    { itemNumber: 21, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI am more easily distracted", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["CONCENTRATION", "HYPOMANIA"] },
    { itemNumber: 22, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI engage in lots of new things", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA", "IMPULSIVITY"] },
    { itemNumber: 23, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nMy thoughts jump from topic to topic", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["DISORGANIZED_THOUGHT", "HYPOMANIA"] },
    { itemNumber: 24, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI do things more quickly and/or more easily", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA"] },
    { itemNumber: 25, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI am more impatient and/or get irritable more easily", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["IRRITABILITY", "HYPOMANIA"] },
    { itemNumber: 26, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI can be exhausting or irritating for others", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["IRRITABILITY", "HYPOMANIA"] },
    { itemNumber: 27, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI get into more quarrels", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["IRRITABILITY", "HOSTILITY", "AGGRESSION"] },
    { itemNumber: 28, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nMy mood is higher, more optimistic", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA"] },
    { itemNumber: 29, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI drink more coffee", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA"] },
    { itemNumber: 30, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI smoke more cigarettes", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["HYPOMANIA"] },
    { itemNumber: 31, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI drink more alcohol", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["ALCOHOL_USE", "HYPOMANIA"] },
    { itemNumber: 32, text: "Think about times when you were in a 'high' or 'up' state. At those times, how much do you agree with the following?\nI take more drugs (sedatives, anxiolytics, stimulants, etc.)", responseMin: 0, responseMax: 1, responseLabels: hcl32Labels, tags: ["DRUG_USE", "HYPOMANIA"] },
  ],
};

// ─── Export All Instruments ──────────────────────────────────────────────────

export const instruments: InstrumentDef[] = [
  // Tier 1
  PHQ9,
  GAD7,
  PHQ15,
  PCPTSD5,
  AUDITC,
  WHO5,
  // Tier 2
  PCL5,
  YBOCS,
  CAPE42,
  AUDIT,
  DAST10,
  MDQ,
  ASRS,
  SPIN,
  PQ16,
  PHQPanic,
  // Tier 2 — Gap-filling
  SPQB,
  AQ10,
  CDS2,
  PID5BF,
  WI7,
  HRSSR,
  BDDQ,
  SCOFF,
  BEDS7,
  PGSI,
  HCL32,
];

export type { InstrumentDef, ItemDef };
