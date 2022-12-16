import { buildLambdaEnvironment } from "../../../lib/util/build-lambda-environment";
import { Duration } from "@aws-cdk/core";

describe("buildLambdaEnvironment", () => {
  test("returns empty object if no options were passed", () => {
    expect(buildLambdaEnvironment({})).toEqual({});
  });

  test("returns environment as is if passed", () => {
    expect(buildLambdaEnvironment({ environment: { FOO: "bar" } })).toEqual({
      FOO: "bar",
    });
  });

  describe("timeout", () => {
    test("adds LAMBDA_EXECUTION_TIMEOUT if timeout provided", () => {
      expect(buildLambdaEnvironment({ timeout: Duration.seconds(60) })).toEqual(
        {
          LAMBDA_EXECUTION_TIMEOUT: "60",
        }
      );
    });

    const conversionCases: {
      amount: number;
      unit: "seconds" | "minutes" | "hours";
      expected: string;
    }[] = [
      { amount: 60, unit: "seconds", expected: "60" },
      { amount: 5, unit: "minutes", expected: "300" },
      { amount: 0.1, unit: "hours", expected: "360" },
    ];
    conversionCases.forEach(({ amount, unit, expected }) => {
      test(`converts timeout to seconds in LAMBDA_EXECUTION_TIMEOUT: ${amount} ${unit}`, () => {
        expect(
          buildLambdaEnvironment({ timeout: Duration[unit](amount) })
        ).toEqual({
          LAMBDA_EXECUTION_TIMEOUT: expected,
        });
      });
    });

    test("merges environment and timeout", () => {
      expect(
        buildLambdaEnvironment({
          environment: { FOO: "bar" },
          timeout: Duration.seconds(60),
        })
      ).toEqual({
        FOO: "bar",
        LAMBDA_EXECUTION_TIMEOUT: "60",
      });
    });

    test("lets environment take precedence over timeout", () => {
      expect(
        buildLambdaEnvironment({
          environment: { LAMBDA_EXECUTION_TIMEOUT: "foo" },
          timeout: Duration.seconds(60),
        })
      ).toEqual({
        LAMBDA_EXECUTION_TIMEOUT: "foo",
      });
    });
  });
});
