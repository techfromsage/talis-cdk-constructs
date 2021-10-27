const aws = require('aws-sdk');
const wkhtmltopdf = require('wkhtmltopdf');

const fs = require('fs');

class SimpleLambdaWorker {
  constructor(event) {
    this.event = event;
  }

  async handle() {
    console.log("START - Simple Worker processing event...");
    console.log('The url: ' + this.event.url);

    const output = `/tmp/urlToPdfOutput.pdf`;
    const writeStream = fs.createWriteStream(output);

    const sampleHtml = '<h1>Test</h1>';

    // Simple output example
    wkhtmltopdf(sampleHtml).pipe(writeStream);
    console.log(fs.existsSync('/tmp/urlToPdfOutput.pdf'));

    console.log('calling s3 testing function...');
    await testS3();

    // let s3 = new aws.S3();
    // let params = {
    //   Bucket: 'development-mr-pdf-bucket',
    //   Key: 'sample.pdf',
    //   Body: 'some text'
    // }
    //
    // console.log('Start of PUT object...');
    // s3.putObject(params, function(err, data){
    //   if (err) {
    //     console.log(err, err.stack)
    //   }
    //   else {
    //     console.log('Complete file upload to S3');
    //   }
    // });
    // console.log('End of put');
    //
    // console.log('Start of list...');
    // s3.listObjects({Bucket: params.Bucket}, function(err, data) {
    //   if (err) {
    //     console.log('Error', err);
    //   } else {
    //     console.log("Success", data);
    //   }
    // });
    // console.log('End of list.');

    //S3 implementation
    // wkhtmltopdf(this.event.url, { pageSize: 'a4'}, () => {
    //   S3.putObject({
    //     Bucket: 'development-mr-pdf-bucket',
    //     Key: 'urlToPdfOutput.pdf',
    //     Body: fs.createReadStream(output),
    //     ContentType: 'application/pdf'
    //   }, (error) => {
    //     if (error != null) {
    //       console.log('urlToPdfOutput.pdf upload failed to send to S3 with error!' + error);
    //       callback('Unable to send file to S3', {});
    //     } else {
    //       console.log('urlToPdfOutput.pdf upload is complete!');
    //       callback(null, { filename: 'urlToPdfOutput.pdf' });
    //     }
    //   })
    // }).pipe(writeStream);

    console.log("END - Simple Worker processing event");
  }
}

// AWS S3 testing function
async function testS3() {
  let s3 = new aws.S3();
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

module.exports.simpleLambdaWorker = async (event) => {
  const simpleLambdaWorker = new SimpleLambdaWorker(event);
  await simpleLambdaWorker.handle();
};
