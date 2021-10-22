import wkhtmltopdf from 'wkhtmltopdf';
import aws from 'aws-sdk';

const fs = require('fs');

class SimpleLambdaWorker {
  constructor(event) {
    this.event = event;
  }

  // async handle() {
  //   console.log("START - Simple Worker processing event...");
  //   console.log('The url: ' + this.event.url);
  //
  //   // const output = `/tmp/urlToPdfOutput.pdf`;
  //   // const writeStream = fs.createWriteStream(output);
  //   //
  //   // const sampleHtml = '<h1>Test</h1>';
  //
  //   //Simple output example
  //   // wkhtmltopdf(sampleHtml).pipe(res);
  //
  //
  //   let s3 = new aws.S3();
  //   let params = {
  //     Bucket: 'development-mr-pdf-bucket',
  //     Key: 'sample.pdf',
  //     Body: 'some text'
  //   }
  //
  //   console.log('Start of PUT object...');
  //   s3.putObject(params, function(err, data){
  //     if (err) {
  //       console.log(err, err.stack)
  //     }
  //     else {
  //       console.log('Complete file upload to S3');
  //     }
  //   });
  //   console.log('End of put');
  //
  //   console.log('Start of list...');
  //   s3.listObjects({Bucket: params.Bucket}, function(err, data) {
  //     if (err) {
  //       console.log('Error', err);
  //     } else {
  //       console.log("Success", data);
  //     }
  //   });
  //   console.log('End of list.');
  //
  //   //S3 implementation
  //   // wkhtmltopdf(this.event.url, { pageSize: 'a4'}, () => {
  //   //   S3.putObject({
  //   //     Bucket: 'development-mr-pdf-bucket',
  //   //     Key: 'urlToPdfOutput.pdf',
  //   //     Body: fs.createReadStream(output),
  //   //     ContentType: 'application/pdf'
  //   //   }, (error) => {
  //   //     if (error != null) {
  //   //       console.log('urlToPdfOutput.pdf upload failed to send to S3 with error!' + error);
  //   //       callback('Unable to send file to S3', {});
  //   //     } else {
  //   //       console.log('urlToPdfOutput.pdf upload is complete!');
  //   //       callback(null, { filename: 'urlToPdfOutput.pdf' });
  //   //     }
  //   //   })
  //   // }).pipe(writeStream);
  //
  //   console.log("END - Simple Worker processing event");
  // }

  async handle() {
      let s3 = new aws.S3();
      let params = {
        Bucket: 'development-mr-pdf-bucket',
        Key: 'sample.pdf',
        Body: 'some text'
      }

      console.log('Start of list...');
      try {
        let s3Objects = s3.listObjects({Bucket: params.Bucket}).promise();
        console.log(s3Objects);
        console.log(JSON.stringify(s3Objects));
      } catch (error) {
        console.log(error);
      }
      console.log('End of bucket listing.')
  }
}

module.exports.simpleLambdaWorker = async (event) => {
  const simpleLambdaWorker = new SimpleLambdaWorker(event);
  await simpleLambdaWorker.handle();
};
