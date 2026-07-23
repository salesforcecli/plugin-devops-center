# summary

List DevOps Center pipelines with their stages, repositories, and connected projects.

# description

Returns all DevOps Center pipelines in the org, including each pipeline's stages (in order), source code repository information per stage, and any connected projects.

# examples

- List all pipelines in the org:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org
