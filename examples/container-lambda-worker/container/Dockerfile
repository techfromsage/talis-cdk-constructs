FROM public.ecr.aws/lambda/nodejs:18.2023.05.13.00

# Assumes your function is named "container-worker.js", and there is a package.json file in the app directory
COPY container-worker.js package.json ${LAMBDA_TASK_ROOT}

# Install NPM dependencies for function
RUN npm install

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "container-worker.containerLambdaWorker" ]
