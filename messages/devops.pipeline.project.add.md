# summary

Attach a DevOps Center project to a pipeline.

# description

You can attach a project to only one pipeline.

# flags.target-org.summary

Username or alias of the DevOps Center org.

# flags.pipeline-id.summary

ID of the pipeline.

# flags.project-id.summary

ID of the DevOps Center project.

# examples

- Attach a project to a pipeline using the project ID and pipeline ID.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0XB000000000001 --project-id 0Hn000000000001

# error.AlreadyAttached

Project %s is already attached to pipeline %s. Remove the project, and then try again.
