const AWS = require('aws-sdk');

const sqs = new AWS.SQS();
const successSqsUrl = process.env.SUCCESS_QUEUE_URL;

class SimpleLambdaWorker {
  constructor(event) {
    this.event = event;
  }

  async handle() {
    console.log("Simple Worker processing event.");

    const message = this.event.Records[0];
    const { result } = JSON.parse(message.body);

    if (result === "FAIL") {
      throw Error("Fail meesage received.");
    } else {
      const params = {
        QueueUrl: successSqsUrl,
        MessageBody: 'Success',
      };
      const response = await sqs.sendMessage(params).promise();
      console.log(`Response from sending message: ${JSON.stringify(response)}`);
    }
  }
}

module.exports.simpleLambdaWorker = async (event) => {
  const simpleLambdaWorker = new SimpleLambdaWorker(event);
  await simpleLambdaWorker.handle();
};
