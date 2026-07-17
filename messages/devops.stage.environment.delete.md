# summary

Delete an environment from a DevOps Center pipeline stage.

# description

Removes the specified environment from the pipeline stage. The environment must belong to an inactive pipeline.

# flags.pipeline-id.summary

ID of the pipeline. Used to verify the pipeline is inactive before deleting.

# flags.environment-id.summary

ID of the environment to delete.

# examples

- Delete an environment:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0XB000000000001 --environment-id 0Xe000000000001

# error.PipelineAlreadyActive

Pipeline %s is already active. Environments can only be removed from inactive pipelines.

# error.EnvironmentNotFound

Environment %s not found. Check the environment ID and try again.
