# summary

Update a DevOps Center pipeline.

# description

Activate, deactivate, or rename a DevOps Center pipeline. Use --active to activate, --no-active to deactivate, and --name to rename. You can combine --no-active and --name in one command.

A pipeline must have at least one stage before you can activate it. You can't modify the pipeline stages after you activate and promote changes through it.

# flags.pipeline-id.summary

ID of the pipeline.

# flags.active.summary

Activate the pipeline. Use --no-active to deactivate.

# flags.name.summary

New name for the pipeline.

# examples

- Activate a pipeline:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0XB000000000001 --active

- Deactivate and rename in one step.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0XB000000000001 --no-active --name "My Pipeline"

# error.NoFlags

Provide at least one of --active/--no-active or --name.

# error.NoStages

Can't activate pipeline %s. Add at least one stage, then try again.

# error.AlreadyActive

Pipeline %s is already active.

# error.AlreadyInactive

Pipeline %s is already inactive.
