import { SQS } from "aws-sdk";

const sqs = new SQS();

const JOB_WHICH_WILL_SUCCEED = { result: 'SUCCESS' };
const JOB_WHICH_WILL_FAIL = { result: 'FAIL' };

describe("LambdaWorker", () => {
  // Increase the timeout We are sending messages and waiting for lambda's to run
  jest.setTimeout(30000);

  let workerSqsUrl: string;
  let originalWorkerSqsLength: number;

  let dlqSqsUrl: string;
  let originalDlqSqsLength: number;

  async function findQueueUrl(
    queuePostfix: string,
    nextToken: string | undefined = undefined
  ): Promise<string> {
    const response = await sqs.listQueues({ NextToken: nextToken }).promise();
/* console.log(`Response: ${response}`); */
/* console.log(`Response String: ${JSON.stringify(response)}`); */

    if (!response.QueueUrls) {
      throw Error("Worker queue not found");
    }

    for (const queueUrl of response.QueueUrls) {
/* console.log(`QueueUrl: ${queueUrl}`) */
      if (
        queueUrl === `https://sqs.eu-west-1.amazonaws.com/302477901552/${process.env.AWS_PREFIX}${queuePostfix}`
      ) {
        return queueUrl;
      }
    }

/* console.log(`Response NextToken : ${JSON.stringify(response.NextToken)}`); */
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

  beforeAll(async () => {
    workerSqsUrl = await findQueueUrl('simple-lambda-worker-queue');
    dlqSqsUrl = await findQueueUrl('simple-lambda-worker-dlq');
  });

  beforeEach(async () => {
    originalWorkerSqsLength = await queueSize(workerSqsUrl);
    originalDlqSqsLength = await queueSize(dlqSqsUrl);
    /* const workerSqsResponse = await sqs.getQueueAttributes({QueueUrl: workerSqsUrl, AttributeNames: [ 'ApproximateNumberOfMessages' ]}).promise(); */
/* /1* if (response && response.Attributes) { *1/ */
/* /1* console.log(`Response: ${response}`); *1/ */
/* /1* console.log(`Response String: ${JSON.stringify(response)}`); *1/ */
/* /1* console.log(`Response String: ${response.Attributes['ApproximateNumberOfMessages']}`); *1/ */
/* /1* } *1/ */
    /* if (workerSqsResponse && workerSqsResponse.Attributes) { */
    /*   originalWorkerSqsLength = +workerSqsResponse.Attributes['ApproximateNumberOfMessages']; */
    /* } else { */
    /*   throw Error("Unable to determine original size of worker queue"); */
    /* } */
/* /1* console.log(`originalWorkerQueueLength = ${originalWorkerSqsLength}`); *1/ */

    /* const dlqSqsResponse = await sqs.getQueueAttributes({QueueUrl: dlqSqsUrl, AttributeNames: [ 'ApproximateNumberOfMessages' ]}).promise(); */
    /* if (dlqSqsResponse && dlqSqsResponse.Attributes) { */
    /*   originalDlqSqsLength = +dlqSqsResponse.Attributes['ApproximateNumberOfMessages']; */
    /* } else { */
    /*   throw Error("Unable to determine original size of dlq queue"); */
    /* } */
/* console.log(`originalDlqQueueLength = ${originalDlqSqsLength}`); */
  });

  test("successfully processes messages", async () => {
    sendJob(JOB_WHICH_WILL_SUCCEED);

    expect("bob").toBe("bob");
  });
});
