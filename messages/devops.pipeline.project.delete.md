# summary

Remove a DevOps Center project's connection to a pipeline.

# description

Deletes the junction record that connects the project to the pipeline. The project itself is not deleted.

# flags.pipeline-id.summary

ID of the pipeline.

# flags.project-id.summary

ID of the DevOps Center project.

# examples

- Remove a project from a pipeline using the project ID and pipeline ID.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0XB000000000001 --project-id 0Hn000000000001

# error.ProjectNotAttached

Project %s is not attached to pipeline %s.
