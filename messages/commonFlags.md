# flags.devops-center-project-name.summary

Name of the DevOps Center project.

# flags.devops-center-username.summary

Username or alias for the DevOps Center org.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you and returns the job ID. To check the status of the operation, run "<%= config.bin %> <%= command.id %> report".

# flags.wait.summary

Number of minutes to wait for command to complete and display results.

# flags.targetDoceOrg.summary

Username or alias of the DevOps Center org.

# flags.job-id.summary

Job ID of the pipeline deploy operation you want to resume.

# flags.job-id.description

These commands return a job ID if they time out or you specified the --async flag:

- sf deploy pipeline
- sf deploy pipeline validate
- sf deploy pipeline quick

The job ID is valid for 10 days from when you started the deploy operation.

# flags.use-most-recent.summary

Use the job ID of the most recent deploy operation.

# flags.use-most-recent.description

For performance reasons, this flag uses job IDs for operations that started in the past 3 days or fewer. If your most recent operation was longer than 3 days ago, this flag won't find a job ID.

# flags.verbose.summary

Show verbose output of the command result.

# flags.concise.summary

Show concise output of the command result.

# errors.NoDefaultDoceEnv

You must specify the DevOps Center org username by indicating the -c flag on the command line or by setting the target-devops-center configuration variable.
