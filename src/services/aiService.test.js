jest.mock("@google/genai", () => {
  const GoogleGenAI = jest.fn();
  return { GoogleGenAI };
});

jest.mock("./toolDefinitions", () => []);
jest.mock("./toolExecutor", () => ({
  executeTool: jest.fn(),
}));

const { GoogleGenAI } = require("@google/genai");
const { askAI } = require("./aiService");

describe("aiService", () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "shared-env-key";
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalEnv;
  });

  it("prefers the user provided API key over the shared env key", async () => {
    const generateContent = jest.fn().mockResolvedValue({
      text: "Using user key",
      functionCalls: [],
    });

    GoogleGenAI.mockImplementation(({ apiKey }) => ({
      apiKey,
      models: { generateContent },
    }));

    const result = await askAI("How much did I spend?", "session-1", {
      apiKey: "user-key-123",
      modelName: "gemini-2.5-pro",
    });

    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: "user-key-123" });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-pro",
      })
    );
    expect(result.answer).toBe("Using user key");
  });

  it("falls back to the shared env key when the user has not saved one", async () => {
    const generateContent = jest.fn().mockResolvedValue({
      text: "Using shared key",
      functionCalls: [],
    });

    GoogleGenAI.mockImplementation(({ apiKey }) => ({
      apiKey,
      models: { generateContent },
    }));

    const result = await askAI("Summarize my spending", "session-2");

    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: "shared-env-key" });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-flash",
      })
    );
    expect(result.answer).toBe("Using shared key");
  });

  it("suggests adding a personal API key when the shared key hits quota", async () => {
    GoogleGenAI.mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockRejectedValue(
          new Error('RESOURCE_EXHAUSTED: Quota exceeded {"code":429}')
        ),
      },
    }));

    const result = await askAI("What are my subscriptions?", "session-3");

    expect(result.answer).toContain("AI quota is temporarily exhausted");
    expect(result.answer).toContain("Add your own Gemini API key");
  });

  it("does not tell the user to add a key again when their own key hits quota", async () => {
    GoogleGenAI.mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockRejectedValue(
          new Error('RESOURCE_EXHAUSTED: Quota exceeded {"code":429}')
        ),
      },
    }));

    const result = await askAI("What are my subscriptions?", "session-4", {
      apiKey: "user-key-123",
    });

    expect(result.answer).toContain("AI quota is temporarily exhausted");
    expect(result.answer).not.toContain("Add your own Gemini API key");
  });
});
