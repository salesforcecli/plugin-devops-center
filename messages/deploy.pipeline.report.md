# summary

Check the status of a deploy operation.

# description

Run this command by either passing it a job ID or specifying the —use-most-recent flag to use the job ID of the most recent deploy operation.

# examples

- Check the status using a job ID:

      <%= config.bin %> <%= command.id %> --devops-center-username MyStagingSandbox --job-id 0Af0x000017yLUFCA2

- Check the status of the most recent deploy operation:

      <%= config.bin %> <%= command.id %> --devops-center-username MyStagingSandbox --use-most-recent

# flags.job-id.summary

Job ID of the deploy operation you want to check the status of.

# flags.job-id.description

The job ID is valid for 10 days from when you started the deploy operation.

# flags.use-most-recent.summary

Use the job ID of the most recent deploy operation.

# flags.use-most-recent.description

For performance reasons, this flag uses job IDs for deploy operations that started only in the past 3 days or less. If your most recent operation was more than 3 days ago, this flag won't find a job ID.
