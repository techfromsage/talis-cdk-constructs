const aws = require('aws-sdk');
const wkhtmltopdf = require('wkhtmltopdf');

const fs = require('fs');

let s3 = new aws.S3();

class SimpleLambdaWorker {
  constructor(event) {
    this.event = event;
  }

  async handle() {
    console.log("START - Simple Worker processing event...");
    console.log('The url: ' + this.event.url);

    const outputFile = '/tmp/urlToPdfOutput.pdf';
    const writeStream = fs.createWriteStream(outputFile);

    const sampleHtml = '<h1>Test</h1>';

    const s3HtmlData = await s3.getObject({
        Bucket: 'development-mr-pdf-bucket',
        Key: 'sample-html.html'
      }
    ).promise();

    console.log('file body: ' + JSON.stringify(s3HtmlData));

    // Simple output example
    // await wkhtmltopdf(s3HtmlData.Body).pipe(writeStream);
    // await wkhtmltopdf(sampleHtml).pipe(writeStream);
    // console.log(fs.existsSync(outputFile));

    console.log('calling s3 testing function...');

    await new Promise((resolve, reject) => {
      wkhtmltopdf(s3HtmlData.Body, {},() => {
        console.log('calling S3 stuff...');
        s3.putObject({
          Bucket: 'development-mr-pdf-bucket',
          Key: 'htmlToPdfOutput.pdf',
          Body: fs.createReadStream(outputFile),
          ContentType: 'application/pdf',
        }, (error) => {
          if (error != null) {
            console.log('Unable to send file to S3', error);
            reject('Unable to send file to S3', {});
          } else {
            console.log('Upload done!');
            resolve('done');
          }
        });
      }).pipe(writeStream);
    });

    // await testS3();
    // await testPutObject('/tmp/urlToPdfOutput.pdf');

    console.log("END - Simple Worker processing event");
  }
}

// AWS S3 testing function
async function testS3() {
  // let s3 = new aws.S3();
  let params = {
    Bucket: 'development-mr-pdf-bucket',
  }
  console.log('Start of list...');
  await s3.listObjectsV2(params, (err, data) => {
    if (err) {
      console.log('There as an error', err);
    } else {
      console.log('***I GOT HERE***');
      let contents = data.Contents;
      contents.forEach(function (content) {
        console.log('Key: ' + content.Key);
      });
    }
  }).promise();

  console.log('End of bucket listing.');
}

async function testPutObject(objectPath) {
  let fileContent = fs.readFileSync(objectPath);
  let putParams = {
    Bucket: 'development-mr-pdf-bucket',
    Key: 'testPdfWrite.pdf',
    Body: fileContent
  }

  console.log('Start of put object...');
  await new Promise((resolve, reject) => {
    s3.putObject(putParams, (err, data) => {
      if (err) {
        console.log('There was an error putting object', err);
        reject(err);
      } else {
        console.log('success');
        console.log(data);
        resolve(data);
      }
    });
  });
  console.log('End of put object...');
}

module.exports.simpleLambdaWorker = async (event) => {
  const simpleLambdaWorker = new SimpleLambdaWorker(event);
  await simpleLambdaWorker.handle();
};