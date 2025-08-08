export async function retryAsync(fn, retries = 3, delay = 2000, backoff = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i < retries - 1) {
        console.log(
          `Attempt ${i + 1} failed. Retrying in ${delay / 1000}s... Error: ${
            error.message
          }`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoff;
      } else {
        console.error("All API retries failed.");
        throw error;
      }
    }
  }
}

export function getMockData() {
  console.log("Processing text with AI (mock implementation)");
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          original_text:
            "A force of 50 N is applied to an object with a mass of 5 kg. What is the resulting acceleration in m/s²?",
          question_template:
            "A force of {force} N is applied to an object with a mass of {mass} kg. What is the resulting acceleration in m/s²?",
          variables: [
            { name: "force", value: 50, unit: "N" },
            { name: "mass", value: 5, unit: "kg" },
          ],
          correct_answer_formula: "force / mass",
          distractor_formulas: [
            "force * mass",
            "mass / force",
            "(force / mass) + 10",
          ],
          category: "Physics",
        },
        {
          original_text:
            "Calculate the area of a rectangle with length 12 cm and width 8 cm.",
          question_template:
            "Calculate the area of a rectangle with length {length} cm and width {width} cm.",
          variables: [
            { name: "length", value: 12, unit: "cm" },
            { name: "width", value: 8, unit: "cm" },
          ],
          correct_answer_formula: "length * width",
          distractor_formulas: [
            "length + width",
            "2 * (length + width)",
            "length / width",
          ],
          category: "Mathematics",
        },
      ]);
    }, 1000);
  });
}
