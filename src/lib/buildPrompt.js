// Builds a single LLM system-prompt string from the template wizard data.
// English scaffolding wraps the (mostly Arabic) values the user entered so each
// input carries clear context. Empty fields are skipped.

const PERSONALITY_LABEL = {
  friendly: "ودود — دافئ وعفوي كصديق مساعد",
  professional: "احترافي — رسمي ومصقول كرجل أعمال",
  enthusiastic: "متحمّس — نشيط ومفعم بالحيوية",
  consultative: "استشاري — هادئ وصبور ومقنع",
};

const OBJECTIVE_LABEL = {
  appointment: "حجز موعد",
  qualify: "تأهيل عميل محتمل",
  followup: "متابعة أو تذكير",
  survey: "استبيان أو تقييم",
  offer: "الترويج لعرض",
};

const SPEED_LABEL = {
  slow: "بطيء",
  normal: "عادي",
  fast: "سريع",
};

const VOICE_LABEL = {
  salwa: "سلوى (صوت نسائي)",
  silma: "سلمى (صوت نسائي)",
  fahad: "فهد (صوت رجالي)",
  sultan: "سلطان (صوت رجالي)",
  salim: "سالم (صوت رجالي)",
};

const LANGUAGE_LABEL = {
  ar: "العربية",
  en: "الإنجليزية",
};

const isFilled = (value) => typeof value === "string" && value.trim() !== "";

// Renders a section only when at least one of its lines has content.
function section(title, lines) {
  const body = lines.filter(Boolean).join("\n");
  return body ? `## ${title}\n${body}` : null;
}

// "label: value" line, or null when the value is empty.
function line(label, value) {
  return isFilled(value) ? `- ${label}: ${value.trim()}` : null;
}

function buildRoleSection(data) {
  return section("IDENTITY", [
    line("Business name", data.brand),
    line("About the business / entity", data.product),
    data.personality && PERSONALITY_LABEL[data.personality]
      ? `- Persona / personality: ${PERSONALITY_LABEL[data.personality]}`
      : null,
    line("Voice", VOICE_LABEL[data.voice]),
    data.speed && SPEED_LABEL[data.speed]
      ? `- Speaking speed: ${SPEED_LABEL[data.speed]}`
      : null,
    data.language && LANGUAGE_LABEL[data.language]
      ? `- Language / dialect: ${LANGUAGE_LABEL[data.language]}`
      : null,
  ]);
}

function buildMissionSection(data) {
  const objective = OBJECTIVE_LABEL[data.objective];
  return objective
    ? `## MISSION\nThe goal of this call is: ${objective}.`
    : null;
}

// The opening line is sent as the campaign `greeting`, so it stays out of the prompt.
function buildScriptSection(data) {
  return section("CALL SCRIPT", [
    line("Reason for the call", data.purpose),
    line("Key talking points", data.points),
    line("Call to action", data.cta),
  ]);
}

function buildObjectionsSection(data) {
  const items = (data.objections || [])
    .filter((o) => isFilled(o.trigger) && isFilled(o.response))
    .map(
      (o) =>
        `- When the customer says "${o.trigger.trim()}", respond with: "${o.response.trim()}".`,
    );
  return items.length ? `## OBJECTION HANDLING\n${items.join("\n")}` : null;
}

function buildComplianceSection(data) {
  const voicemail =
    data.voicemail === "leave" && isFilled(data.voicemailText)
      ? `Leave this voicemail message: "${data.voicemailText.trim()}"`
      : data.voicemail === "hangup"
        ? "Hang up without leaving a message."
        : null;

  const transfer = data.transfer
    ? `Transfer to a human agent${
        isFilled(data.transferNumber) ? ` at ${data.transferNumber.trim()}` : ""
      }.`
    : "Do not transfer to a human agent.";

  return section("FALLBACK & COMPLIANCE", [
    voicemail ? `- On voicemail: ${voicemail}` : null,
    `- Human transfer: ${transfer}`,
    line("Opt-out handling", data.optOut),
    data.maxDuration
      ? `- Maximum call duration: ${data.maxDuration} minute(s).`
      : null,
  ]);
}

export function buildPrompt(data) {
  const intro = data.name?.trim()
    ? `You are an AI voice agent for the outbound call campaign "${data.name.trim()}". Follow this configuration precisely.`
    : "You are an AI voice agent for an outbound phone call. Follow this configuration precisely.";

  const sections = [
    intro,
    buildRoleSection(data),
    buildMissionSection(data),
    buildScriptSection(data),
    buildObjectionsSection(data),
    buildComplianceSection(data),
  ].filter(Boolean);

  return sections.join("\n\n");
}
