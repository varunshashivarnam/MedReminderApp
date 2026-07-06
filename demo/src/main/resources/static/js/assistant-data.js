/* ============ MedReminder — assistant knowledge base ============
   Educational information only. Every answer the assistant gives appends
   a reminder to consult a doctor or pharmacist for medical decisions. */

window.MED_KB = {
  tretinoin: {
    aliases: ['tretinoin', 'tret', 'retin-a', 'retina', 'retinoic acid'],
    what: 'Tretinoin is a topical retinoid (a vitamin-A derivative) used for acne and skin texture. It speeds up skin cell turnover, which helps unclog pores and fade post-acne marks over time.',
    timing: 'Apply at night only — it breaks down in sunlight and can make skin more sun-sensitive. Wait 20–30 minutes after washing your face so skin is fully dry (applying to damp skin increases irritation). A pea-sized amount covers the whole face.',
    missed: 'If you miss a night, just skip it and continue the next night. Do NOT apply extra to make up for it — doubling up doesn\'t speed results, it only increases irritation. Consistency over months matters far more than any single application.',
    tooMuch: 'Using too much (or too often) commonly causes redness, peeling, burning, and dryness — sometimes called the "retinoid uglies." If this happens: pause for a few nights, moisturize generously, and restart at a lower frequency (e.g. every 2–3 nights), building up slowly. Applying more than a pea-sized amount does not work faster.',
    sideEffects: 'Very common in the first 4–6 weeks: dryness, flaking, redness, mild stinging, and an initial "purge" where acne temporarily worsens before improving. These usually settle as skin adapts. Severe blistering, swelling, or persistent burning is not normal — contact your doctor.',
    food: 'Not applicable — tretinoin is topical. However, avoid applying it at the same time as benzoyl peroxide (can deactivate some formulations and multiply irritation) and go easy on other exfoliants (AHAs/BHAs) on the same nights.',
    companions: 'Things that pair well with tretinoin: 1) A gentle, non-foaming cleanser. 2) A good moisturizer — many people "sandwich" (moisturizer → tret → moisturizer) to reduce irritation. 3) Broad-spectrum SPF 30+ every morning — non-negotiable, since tretinoin makes skin sun-sensitive. 4) Patience: visible results typically take 8–12 weeks. Avoid waxing treated areas and harsh scrubs.',
    interactions: 'Avoid layering with benzoyl peroxide (same application time), other retinoids, or strong exfoliating acids on the same night. If you\'re prescribed oral acne medication (like isotretinoin), your doctor manages that combination. Pregnancy: retinoids are generally avoided — tell your doctor if you are or may become pregnant.'
  },
  lisinopril: {
    aliases: ['lisinopril', 'zestril', 'prinivil'],
    what: 'Lisinopril is an ACE inhibitor used to lower blood pressure and protect the heart and kidneys.',
    timing: 'Usually taken once daily at the same time each day, with or without food. Many people take it in the morning.',
    missed: 'Take it as soon as you remember, unless it\'s nearly time for your next dose — then skip the missed one. Never take two doses at once.',
    tooMuch: 'Taking too much can cause dizziness, lightheadedness, or fainting from low blood pressure. If you suspect an overdose, sit or lie down and contact a poison control center or emergency services.',
    sideEffects: 'The most talked-about one is a persistent dry cough. Others: dizziness (especially at first), headache, elevated potassium. A swollen face, lips, or tongue (angioedema) is an emergency — seek help immediately.',
    food: 'No food requirement. Avoid potassium-based salt substitutes unless your doctor approves, since lisinopril already raises potassium.',
    companions: 'Keep up regular blood pressure logging (the Health Log page is great for this). Stay hydrated, and rise slowly from sitting to standing when you first start.',
    interactions: 'NSAIDs like ibuprofen can blunt its effect and stress the kidneys when used regularly. Potassium supplements and salt substitutes can push potassium too high. Tell your doctor about diuretics or lithium.'
  },
  metformin: {
    aliases: ['metformin', 'glucophage'],
    what: 'Metformin lowers blood sugar in type 2 diabetes by reducing the liver\'s glucose production and improving insulin sensitivity.',
    timing: 'Take it with meals to reduce stomach upset — commonly with breakfast and/or dinner depending on your prescription.',
    missed: 'Take it with your next meal if you remember the same day; don\'t double the next dose.',
    tooMuch: 'A large overdose can cause lactic acidosis (rare but serious): deep rapid breathing, severe fatigue, muscle pain, stomach pain. This is a medical emergency.',
    sideEffects: 'Mostly digestive: nausea, diarrhea, metallic taste — usually improving after the first weeks. Long-term use can lower vitamin B12.',
    food: 'Always with food. Limit heavy alcohol use, which raises the lactic acidosis risk.',
    companions: 'Regular blood-sugar logging, and your doctor may periodically check B12 and kidney function.',
    interactions: 'Alcohol (heavy use), contrast dye for scans (your doctor may pause metformin around imaging), and some diuretics. Always share your full med list with your pharmacist.'
  },
  atorvastatin: {
    aliases: ['atorvastatin', 'lipitor'],
    what: 'Atorvastatin is a statin that lowers LDL ("bad") cholesterol and reduces cardiovascular risk.',
    timing: 'Once daily, any consistent time — atorvastatin works morning or evening (unlike some older statins that must be taken at night).',
    missed: 'Take it when you remember unless the next dose is close; never double up.',
    tooMuch: 'An extra dose is rarely dangerous but call your pharmacist. Ongoing high doses raise the risk of muscle damage.',
    sideEffects: 'Muscle aches are the most common complaint. Unexplained severe muscle pain, weakness, or dark urine needs prompt medical attention. Mild digestive upset and headache can occur.',
    food: 'With or without food — but avoid large amounts of grapefruit juice, which raises atorvastatin levels.',
    companions: 'Pairs with lifestyle: diet, exercise, and periodic cholesterol and liver tests from your doctor.',
    interactions: 'Grapefruit juice (large amounts), some antibiotics and antifungals, and other cholesterol drugs like gemfibrozil. Check with a pharmacist before adding new medicines.'
  },
  amlodipine: {
    aliases: ['amlodipine', 'norvasc'],
    what: 'Amlodipine is a calcium-channel blocker that relaxes blood vessels to lower blood pressure and prevent chest pain (angina).',
    timing: 'Once daily at a consistent time, with or without food.',
    missed: 'Take when remembered unless it\'s almost time for the next dose. Don\'t double.',
    tooMuch: 'Can cause pronounced low blood pressure — dizziness, fainting, rapid heartbeat. Seek medical help for a suspected overdose.',
    sideEffects: 'Ankle/leg swelling is characteristic. Also flushing, headache, fatigue, and palpitations.',
    food: 'No food restrictions; grapefruit has minimal effect on amlodipine compared to some other drugs, but moderation is sensible.',
    companions: 'Blood pressure logging helps your doctor fine-tune the dose. Elevating legs can ease mild ankle swelling.',
    interactions: 'Other blood-pressure drugs (additive effect), simvastatin at high doses, and some antifungals. Review combinations with your pharmacist.'
  },
  aspirin: {
    aliases: ['aspirin', 'asa', 'acetylsalicylic'],
    what: 'Low-dose aspirin thins the blood by making platelets less sticky; it\'s used to reduce heart attack and stroke risk in selected people.',
    timing: 'Once daily, ideally with food to protect the stomach.',
    missed: 'Take when remembered the same day; skip if it\'s the next day. Don\'t double.',
    tooMuch: 'High doses cause ringing ears, nausea, stomach pain, and bleeding risk. Large overdoses are dangerous — contact poison control.',
    sideEffects: 'Stomach irritation, heartburn, easier bruising and bleeding. Black/tarry stools or vomiting blood needs urgent care.',
    food: 'Take with food or a full glass of water.',
    companions: 'Your doctor may suggest a stomach protector (like omeprazole) if you have reflux or irritation.',
    interactions: 'Other blood thinners (warfarin — significant bleeding risk), NSAIDs like ibuprofen (stomach bleeding risk and can interfere with aspirin\'s heart benefit if taken right before it), and alcohol.'
  },
  ibuprofen: {
    aliases: ['ibuprofen', 'advil', 'motrin', 'nurofen'],
    what: 'Ibuprofen is an NSAID for pain, inflammation, and fever.',
    timing: 'As needed with food, spacing doses at least 6 hours apart and staying under the daily maximum on the label.',
    missed: 'It\'s as-needed — no schedule to catch up on.',
    tooMuch: 'Overuse causes stomach pain, ulcers, kidney stress, and raised blood pressure. A large overdose needs medical attention.',
    sideEffects: 'Stomach upset, heartburn, dizziness. Long-term regular use raises stomach-bleed and kidney risks.',
    food: 'Always with food or milk.',
    companions: 'For frequent pain, discuss alternatives with your doctor rather than daily NSAID use — especially since you take blood-pressure medication.',
    interactions: 'Blood-pressure medicines like lisinopril (reduced effect, kidney strain), aspirin (bleeding, blunted heart benefit), other blood thinners like warfarin (serious bleeding risk), and alcohol.'
  },
  omeprazole: {
    aliases: ['omeprazole', 'prilosec'],
    what: 'Omeprazole is a proton-pump inhibitor that reduces stomach acid, used for reflux, heartburn, and ulcer protection.',
    timing: 'Best taken 30–60 minutes before breakfast on an empty stomach.',
    missed: 'Take before your next meal if the same day; otherwise skip.',
    tooMuch: 'An extra capsule is rarely harmful, but persistent overuse should be reviewed — long-term acid suppression has trade-offs.',
    sideEffects: 'Headache, nausea, gas. Long-term use can affect B12, magnesium, and bone density — worth periodic review with your doctor.',
    food: 'Before food, not with it — food reduces its absorption.',
    companions: 'Pairs with avoiding late heavy meals and known reflux triggers.',
    interactions: 'Can interact with clopidogrel and affect absorption of some drugs. Mention it to your pharmacist whenever you add a medicine.'
  },
  'vitamin d3': {
    aliases: ['vitamin d', 'vitamin d3', 'cholecalciferol', 'd3'],
    what: 'Vitamin D3 supports bone health, calcium absorption, muscle function and immunity.',
    timing: 'Any time of day; absorption is best with a meal containing some fat.',
    missed: 'No problem — take the next scheduled dose. Vitamin D is stored in body fat, so a missed dose barely matters.',
    tooMuch: 'Very high doses over long periods can cause high calcium: nausea, thirst, confusion, kidney stones. Stick to your prescribed dose.',
    sideEffects: 'Rare at normal doses.',
    food: 'With a meal containing fat for best absorption.',
    companions: 'Your doctor may pair it with calcium or check blood levels annually.',
    interactions: 'Few at normal doses. Very high doses interact with certain diuretics and heart medicines.'
  }
};

/* Pairwise interaction warnings (order-independent). */
window.MED_INTERACTIONS = [
  {
    pair: ['ibuprofen', 'lisinopril'],
    severity: 'moderate',
    warning: 'NSAIDs like ibuprofen can reduce lisinopril\'s blood-pressure-lowering effect and strain the kidneys, especially with regular use. Occasional single doses are usually tolerated, but check with your pharmacist.'
  },
  {
    pair: ['ibuprofen', 'aspirin'],
    severity: 'moderate',
    warning: 'Taking ibuprofen with low-dose aspirin raises stomach-bleeding risk and can interfere with aspirin\'s heart-protective effect. If both are needed, timing matters — ask your pharmacist.'
  },
  {
    pair: ['ibuprofen', 'warfarin'],
    severity: 'high',
    warning: 'May significantly increase bleeding risk. This combination is generally avoided — talk to your doctor before combining them.'
  },
  {
    pair: ['aspirin', 'warfarin'],
    severity: 'high',
    warning: 'Two blood thinners together sharply increase bleeding risk. Only ever combined under close medical supervision.'
  },
  {
    pair: ['atorvastatin', 'grapefruit'],
    severity: 'moderate',
    warning: 'Large amounts of grapefruit juice raise atorvastatin levels and the risk of muscle side effects.'
  },
  {
    pair: ['tretinoin', 'benzoyl peroxide'],
    severity: 'moderate',
    warning: 'Applied at the same time, benzoyl peroxide can deactivate some tretinoin formulations and the combination multiplies dryness and irritation. Common workaround: benzoyl peroxide in the morning, tretinoin at night — confirm with your dermatologist.'
  },
  {
    pair: ['tretinoin', 'salicylic acid'],
    severity: 'mild',
    warning: 'Layering exfoliating acids with tretinoin often over-irritates skin. Alternate nights or use acids in the morning.'
  },
  {
    pair: ['metformin', 'alcohol'],
    severity: 'moderate',
    warning: 'Heavy alcohol with metformin raises the risk of lactic acidosis and low blood sugar. Light, occasional drinking is usually acceptable — confirm with your doctor.'
  },
  {
    pair: ['lisinopril', 'potassium'],
    severity: 'moderate',
    warning: 'Lisinopril raises potassium; adding potassium supplements or salt substitutes can push it dangerously high.'
  },
  {
    pair: ['omeprazole', 'clopidogrel'],
    severity: 'moderate',
    warning: 'Omeprazole can reduce clopidogrel\'s antiplatelet effect. Alternatives exist — ask your doctor.'
  }
];

window.ASSISTANT_DISCLAIMER = 'This is general educational information, not medical advice. Please confirm anything important with your doctor or pharmacist.';
