# summary

Resume watching a pipeline deploy operation.

# description

Before you run this command, authorize the org in which DevOps Center is installed. The easiest way to authorize an org is with the "sf org login web" command. 

Use this command to resume watching a pipeline deploy operation if the original command times out or you specified the --async flag.

Run this command by either indicating a job ID or specifying the --use-most-recent flag to use the job ID of the most recent deploy operation.

# examples

- Resume watching a deploy operation using a job ID:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

- Resume watching the most recent deploy operation:

      <%= config.bin %> <%= command.id %> --use-most-recent
