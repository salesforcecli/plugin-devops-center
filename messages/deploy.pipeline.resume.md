# summary

Resume watching a pipeline deploy operation.

# description

Use this command to resume watching a pipeline deploy operation if the original command times out or you specified the --async flag.

Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most recent deploy operation.

# examples

- Resume watching a deploy operation using a job ID:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

- Resume watching the most recent deploy operation:

      <%= config.bin %> <%= command.id %> --use-most-recent

# error.ClientTimeout

The command has timed out, although it is still running. To check the status of the deploy operation, run "sf deploy pipeline report".
