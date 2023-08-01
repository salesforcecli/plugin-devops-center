# summary

Quickly deploy a validated deployment to an org.

# description

Before you run this command, first create a validated deployment with the "sf project deploy pipeline validate" command, which returns a job ID. Validated deployments haven't been deployed to the org yet; you deploy them with this command. Either pass the job ID to this command or use the --use-most-recent flag to use the job ID of the most recently validated deployment. For the quick deploy to succeed, the associated validated deployment must also have succeeded.

Executing this quick deploy command takes less time than a standard deploy because it skips running Apex tests. These tests were previously run as part of the validation. Validating first and then running a quick deploy is useful if the deployment to your production org take several hours and you don’t want to risk a failed deploy.

This command doesn't support source-tracking. The source you deploy overwrites the corresponding metadata in your org. This command doesn’t attempt to merge your source with the versions in your org.

# examples

- Run a quick deploy using your default Devops Center org and a job ID:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

- Asynchronously run a quick deploy of the most recently validated deployment using an org with alias "my-prod-org":

      <%= config.bin %> <%= command.id %> --async --use-most-recent --devops-center-username my-prod-org

# flags.job-id.summary

Job ID of the validated deployment to quick deploy.

# flags.job-id.description

The job ID is valid for 10 days from when you started the validation.

# flags.use-most-recent.summary

Use the job ID of the most recently validated deployment.

# flags.use-most-recent.description

For performance reasons, this flag uses only job IDs that were validated in the past 3 days or less. If your most recent deployment validation was more than 3 days ago, this flag won't find the job ID.

# error.JobIsNotValidationDeployment

The job ID is invalid for the quick deployment. Verify that a deployment validation was run or hasn't expired, and that you specified the correct job ID. Then try again.

# error.JobIsNotValidated

We can't perform the quick deployment for the specified job ID because the validate-only deployment failed or is still running. If the validate-only deployment failed, fix the issue and re-run it. If the validate-only deployment was successful, try this command again later.
