/**
 * Parses and evaluates a mathematical expression using the Shunting-Yard algorithm.
 * Supports basic arithmetic (+, -, *, /), decimal numbers, and parentheses.
 * Automatically handles unary minus at the start of expression or after parentheses/operators.
 */
export function evaluateArithmetic(expr: string): number {
  const clean = expr.replace(/\s+/g, "");
  if (!clean) return 0;

  // Validate allowed characters: numbers, dots, operators, parentheses
  if (!/^[0-9+\-*/().]+$/.test(clean)) {
    throw new Error("Invalid characters");
  }

  // Tokenize the expression
  const tokens: string[] = [];
  let numBuffer = "";

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];

    if (/[0-9.]/.test(char)) {
      numBuffer += char;
    } else {
      if (numBuffer) {
        tokens.push(numBuffer);
        numBuffer = "";
      }

      // Handle unary minus by prepending "0" before the operator if it is
      // at index 0 or immediately follows another operator or "("
      if (char === "-") {
        const lastToken = tokens[tokens.length - 1];
        const isUnary =
          tokens.length === 0 ||
          lastToken === "(" ||
          ["+", "-", "*", "/"].includes(lastToken);
        if (isUnary) {
          tokens.push("0");
        }
      }

      if (["+", "-", "*", "/", "(", ")"].includes(char)) {
        tokens.push(char);
      }
    }
  }
  if (numBuffer) {
    tokens.push(numBuffer);
  }

  // Shunting-Yard Algorithm
  const precedence: Record<string, number> = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
  };

  const outputQueue: string[] = [];
  const operatorStack: string[] = [];

  for (const token of tokens) {
    if (!isNaN(parseFloat(token))) {
      outputQueue.push(token);
    } else if (token === "(") {
      operatorStack.push(token);
    } else if (token === ")") {
      let top = operatorStack.pop();
      while (top && top !== "(") {
        outputQueue.push(top);
        top = operatorStack.pop();
      }
      if (top !== "(") {
        throw new Error("Mismatched parentheses");
      }
    } else {
      // Operator
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1] !== "(" &&
        precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
      ) {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.push(token);
    }
  }

  while (operatorStack.length > 0) {
    const op = operatorStack.pop()!;
    if (op === "(" || op === ")") {
      throw new Error("Mismatched parentheses");
    }
    outputQueue.push(op);
  }

  // RPN (Reverse Polish Notation) Evaluation
  const stack: number[] = [];
  for (const token of outputQueue) {
    if (!isNaN(parseFloat(token))) {
      stack.push(parseFloat(token));
    } else {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) {
        throw new Error("Invalid structure");
      }
      switch (token) {
        case "+":
          stack.push(a + b);
          break;
        case "-":
          stack.push(a - b);
          break;
        case "*":
          stack.push(a * b);
          break;
        case "/":
          if (b === 0) throw new Error("Division by zero");
          stack.push(a / b);
          break;
        default:
          throw new Error("Unknown operator");
      }
    }
  }

  if (stack.length !== 1) {
    throw new Error("Evaluation error");
  }

  return stack[0];
}
