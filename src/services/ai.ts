import "server-only";

import OpenAI from "openai";

export interface RecoveryMissionStep {
  order: number;
  title: string;
  hint: string;
  studentAction: string;
  encouragement: string;
}

export interface GeneratedMission {
  problemText: string;
  subject: string;
  concept: string;
  difficulty: "easy" | "medium" | "hard";
  steps: RecoveryMissionStep[];
}

const DEFAULT_OPENAI_MODEL = "gpt-4o";

const missionResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    problemText: {
      type: "string",
      description: "이미지에서 읽은 문제 내용을 한국어로 간결하게 옮긴 텍스트",
    },
    subject: {
      type: "string",
      description: "문제 과목 또는 영역. 예: 수학, 국어, 과학",
    },
    concept: {
      type: "string",
      description: "학생이 회복해야 할 핵심 개념",
    },
    difficulty: {
      type: "string",
      enum: ["easy", "medium", "hard"],
      description: "초등학생 기준 난이도",
    },
    steps: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          order: {
            type: "integer",
            enum: [1, 2, 3],
          },
          title: {
            type: "string",
          },
          hint: {
            type: "string",
            description: "정답을 직접 말하지 않는 소크라테스식 힌트",
          },
          studentAction: {
            type: "string",
            description: "학생이 직접 해볼 작은 행동",
          },
          encouragement: {
            type: "string",
            description: "아이 눈높이의 짧은 격려 문장",
          },
        },
        required: ["order", "title", "hint", "studentAction", "encouragement"],
      },
    },
  },
  required: ["problemText", "subject", "concept", "difficulty", "steps"],
} as const;

const missionDeveloperPrompt = `
너는 초등학생을 위한 소크라테스식 오답 회복 튜터이다.
이미지 속 문제를 읽고 아이가 스스로 다시 생각하도록 3단계 힌트 미션을 만든다.

원칙:
- 정답, 최종 계산 결과, 완성된 풀이를 직접 말하지 않는다.
- 아이가 바로 해볼 수 있는 작은 질문과 행동으로 안내한다.
- 겁주거나 평가하지 않고 따뜻하고 짧은 한국어를 사용한다.
- 문제를 확실히 읽기 어렵다면 problemText에 보이는 범위만 쓰고, 첫 힌트에서 문제를 다시 확인하게 한다.
- JSON 스키마를 반드시 지킨다.
`;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY 환경변수가 필요합니다.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function assertGeneratedMission(value: GeneratedMission): GeneratedMission {
  if (!Array.isArray(value.steps) || value.steps.length !== 3) {
    throw new Error("AI 응답의 힌트 단계는 정확히 3개여야 합니다.");
  }

  const orderedSteps = value.steps.map((step, index) => ({
    ...step,
    order: index + 1,
  }));

  return {
    ...value,
    steps: orderedSteps,
  };
}

export async function generateMission(imageUrl: string): Promise<GeneratedMission> {
  if (!imageUrl) {
    throw new Error("분석할 이미지 URL이 필요합니다.");
  }

  const client = getOpenAIClient();
  const model = process.env.OPENAI_VISION_MODEL || DEFAULT_OPENAI_MODEL;

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: missionDeveloperPrompt,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "이 오답 문제 이미지를 분석해서 초등학생이 스스로 풀 수 있는 3단계 회복 미션 JSON을 만들어줘.",
          },
          {
            type: "input_image",
            image_url: imageUrl,
            detail: "high",
          },
        ],
      },
    ],
    max_output_tokens: 1400,
    text: {
      format: {
        type: "json_schema",
        name: "loopnote_recovery_mission",
        strict: true,
        schema: missionResponseSchema,
      },
    },
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error("AI가 미션 JSON을 반환하지 않았습니다.");
  }

  return assertGeneratedMission(JSON.parse(outputText) as GeneratedMission);
}

export interface EvaluationResult {
  isCorrect: boolean;
  feedback: string;
}

const evaluationResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    isCorrect: {
      type: "boolean",
      description: "답변이 유의미하거나 의도에 맞는지 여부. 맞으면 true, 의미 없는 입력(예: 'asdf', '123')이거나 완전히 빗나갔다면 false",
    },
    feedback: {
      type: "string",
      description: "학생에게 해줄 아주 다정하고 용기를 주는 한두 문장의 격려 힌트",
    },
  },
  required: ["isCorrect", "feedback"],
} as const;

const evaluationDeveloperPrompt = `
너는 초등학생을 위한 소크라테스식 오답 회복 튜터이다.
학생이 제시된 단계의 질문에 답한 답변이 맞는지, 혹은 유의미한 시도인지 평가하고 피드백을 제공한다.

평가 원칙:
- 완벽한 정답이 아니더라도, 질문의 핵심 의도에 맞게 진지하게 생각을 표현했거나 계산 과정을 한 글자라도 적었다면 올바른 시도로 간주한다 (isCorrect: true).
- 그러나 의미 없는 텍스트(예: "asd", "123", "abc", "모르겠음", "글자 채우기")나 질문 및 수학 개념과 완전히 상관없는 장난식 텍스트는 오답으로 판단한다 (isCorrect: false).
- 아이가 상처받지 않도록 매우 다정하고 격려하는 어조의 짧은 한국어 한두 문장으로 피드백(feedback)을 작성한다.
- JSON 스키마를 반드시 지킨다.
`;

export async function evaluateStepAnswer(
  problemText: string,
  stepTitle: string,
  stepHint: string,
  studentAnswer: string
): Promise<EvaluationResult> {
  if (!studentAnswer || studentAnswer.trim().length === 0) {
    return {
      isCorrect: false,
      feedback: "아무것도 적지 않았어요! 나의 멋진 생각을 조금만이라도 적어볼까요? 🌱",
    };
  }

  const client = getOpenAIClient();
  const model = DEFAULT_OPENAI_MODEL; // gpt-4o

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: evaluationDeveloperPrompt,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `원래 문제: "${problemText}"\n현재 단계: "${stepTitle}"\n단계 힌트: "${stepHint}"\n학생의 답변: "${studentAnswer}"\n\n이 답변이 맞는지, 혹은 유의미한 풀이 시도인지 평가하고 다정하게 격려해줘.`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "loopnote_answer_evaluation",
        strict: true,
        schema: evaluationResponseSchema,
      },
    },
  });

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("AI가 평가 결과를 반환하지 않았습니다.");
  }

  return JSON.parse(outputText) as EvaluationResult;
}
