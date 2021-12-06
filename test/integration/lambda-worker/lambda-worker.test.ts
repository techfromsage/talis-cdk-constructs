import { SQS } from "aws-sdk";

const sqs = new SQS();

const JOB_WHICH_WILL_SUCCEED = { result: 'SUCCESS' };
const JOB_WHICH_WILL_FAIL = { result: 'FAIL' };

describe("LambdaWorker", () => {
  // Increase the timeout We are sending messages and waiting for lambda's to run
  jest.setTimeout(600000);

  let workerSqsUrl: string;

  let successSqsUrl: string;
  let originalSuccessSqsLength: number;

  let dlqSqsUrl: string;
  let originalDlqSqsLength: number;

  async function findQueueUrl(
    queuePostfix: string,
    nextToken: string | undefined = undefined
  ): Promise<string> {
    const response = await sqs.listQueues({ NextToken: nextToken }).promise();

    if (!response.QueueUrls) {
      throw Error("Worker queue not found");
    }

    for (const queueUrl of response.QueueUrls) {
      if (
        queueUrl === `https://sqs.eu-west-1.amazonaws.com/302477901552/${process.env.AWS_PREFIX}${queuePostfix}`
      ) {
        return queueUrl;
      }
    }

    if (response.NextToken) {
      return await findQueueUrl(response.NextToken);
    }

    throw Error("Worker queue not found");
  }

  async function sendJob(message: Object) {
    const params = {
      QueueUrl: workerSqsUrl,
      MessageBody: JSON.stringify(message),
    };
    await sqs.sendMessage(params).promise();
  };

  async function queueSize(queueUrl: string): Promise<number> {
    const response = await sqs.getQueueAttributes({QueueUrl: queueUrl, AttributeNames: [ 'ApproximateNumberOfMessages' ]}).promise();
    if (response && response.Attributes) {
      return +response.Attributes['ApproximateNumberOfMessages'];
    } else {
      throw Error("Unable to determine size of queue");
    }
  }

  async function waitForQueueSizeToBe(queueUrl: string, expectedSize: number) {
    const checkPeriod: number = 10000;
    const attempts: number = 30;
    let currentAttempt: number = 1;

    while (currentAttempt++ <= attempts) {
      const currentSize = await queueSize(queueUrl);
      if (currentSize === expectedSize) {
        return;
      } else if (currentSize > expectedSize) {
        throw Error("Found too many messages on the queue");
      } else {
        await sleep(checkPeriod);
      }
    }

    throw Error("Expected queue size not reached");
  }

  function sleep(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

  beforeAll(async () => {
    workerSqsUrl = await findQueueUrl('simple-lambda-worker-queue');
    dlqSqsUrl = await findQueueUrl('simple-lambda-worker-dlq');
    successSqsUrl = await findQueueUrl('simple-lambda-worker-success');
  });

  beforeEach(async () => {
    await sleep(5000);
    originalSuccessSqsLength = await queueSize(successSqsUrl);
    originalDlqSqsLength = await queueSize(dlqSqsUrl);
  });

  test("successfully processes messages", async () => {
    sendJob(JOB_WHICH_WILL_SUCCEED);

    await sleep(5000);

    /* const successSqsLength = await queueSize(successSqsUrl); */
    /* const dlqSqsLength = await queueSize(dlqSqsUrl); */

    await waitForQueueSizeToBe(successSqsUrl, originalSuccessSqsLength + 1);
    await waitForQueueSizeToBe(dlqSqsUrl, originalDlqSqsLength);
    /* expect(successSqsLength).toBe(originalSuccessSqsLength + 1); */
    /* expect(dlqSqsLength).toBe(originalDlqSqsLength); */
  });

  test("failed messages go to the dlq", async () => {
    sendJob(JOB_WHICH_WILL_FAIL);

    await sleep(5000);

    await waitForQueueSizeToBe(dlqSqsUrl, originalDlqSqsLength + 1);
    await waitForQueueSizeToBe(successSqsUrl, originalSuccessSqsLength);

    /* const successSqsLength = await queueSize(successSqsUrl); */
    /* const dlqSqsLength = await queueSize(dlqSqsUrl); */

    /* expect(successSqsLength).toBe(originalSuccessSqsLength); */
    /* expect(dlqSqsLength).toBe(originalDlqSqsLength + 1); */
  });
});
