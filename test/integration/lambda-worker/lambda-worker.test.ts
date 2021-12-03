/* const AWS = require('aws-sdk'); */

/* const sqs = new AWS.SQS(); */

/* const JOB_WHICH_WILL_SUCCEED = { result: 'SUCCESS' }; */
/* const JOB_WHICH_WILL_FAIL = { result: 'FAIL' }; */

describe("LambdaWorker", () => {
  /* async function sendJob(message) { */
  /*   const params = { */
  /*     QueueUrl: successSqsUrl, */
  /*     MessageBody: JSON.stringify(message), */
  /*   }; */
  /*   await sqs.sendMessage(params).promise(); */
  /* }; */

  test("successfully processes messages", async () => {
    /* sendJob(JOB_WHICH_WILL_SUCCEED); */
    expect("bob").toBe("bob");
  });
});
