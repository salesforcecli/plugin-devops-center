# summary

Create a DevOps Center project in a DevOps Center org.

# description

Creates a new DevOps Center project with the specified name and optional description.

# flags.target-org.summary

Username or alias of the DevOps Center org.

# flags.name.summary

Name of the new DevOps Center project.

# flags.description.summary

Description of the new project; if not specified, the description is blank.

# examples

- Create a new DevOps Center project in the specified org.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --name "MyApp Release"

- Create a project with a name and description.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --name "Platform Update" --description "Platform services update"
