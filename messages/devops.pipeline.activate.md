# summary

Activate a DevOps Center pipeline for deployments.

# description

A pipeline must have at least one stage before you activate it. You can't modify the pipeline stages after you activate and promote changes through it.

# flags.target-org.summary

Username or alias of the DevOps Center org.

# flags.pipeline-id.summary

ID of the pipeline.

# examples

- Activate a pipeline using the pipeline ID.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0XB000000000001

# error.NoStages

Can't activate pipeline %s. Add at least one stage, then try again.

# error.AlreadyActive

Pipeline %s is already active.
