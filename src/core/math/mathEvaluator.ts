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

  // ── Tokenize ───────────────────────────────────────────────────────────────
  // A unary minus is folded into the value it applies to, rather than being
  // rewritten as "0 -". That older trick only worked next to + and −, which
  // share precedence: "2*-3" became "2*0-3" = −3 instead of −6, and "8/-2"
  // became "8/0-2", which threw "Division by zero".
  const tokens: string[] = [];
  let numBuffer = "";
  // True where an OPERAND is expected — the start of the expression, just after
  // "(", or just after an operator. That is exactly where "-" means "negative"
  // rather than "subtract".
  let expectOperand = true;
  // Set when a unary minus should be folded into the number literal that follows.
  let negateNext = false;

  const flushNumber = () => {
    if (!numBuffer) return;
    tokens.push(negateNext ? `-${numBuffer}` : numBuffer);
    numBuffer = "";
    negateNext = false;
    expectOperand = false;
  };

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];

    if (/[0-9.]/.test(char)) {
      numBuffer += char;
      continue;
    }

    flushNumber();

    if (char === "(") {
      tokens.push(char);
      expectOperand = true;
    } else if (char === ")") {
      tokens.push(char);
      expectOperand = false;
    } else if (expectOperand && (char === "+" || char === "-")) {
      // A leading sign. "+" is a no-op. "-" either negates the number that
      // follows, or — when it applies to a bracketed group — becomes an explicit
      // "-1 *" factor so it binds to the whole group and not just its first term.
      if (char === "-") {
        const next = clean[i + 1];
        if (next && /[0-9.]/.test(next)) {
          negateNext = true;
        } else {
          tokens.push("-1", "*");
        }
      }
      // An operand is still expected either way.
    } else if (["+", "-", "*", "/"].includes(char)) {
      tokens.push(char);
      expectOperand = true;
    }
  }
  flushNumber();

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
