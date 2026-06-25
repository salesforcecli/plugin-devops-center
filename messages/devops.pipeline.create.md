# summary

Create a DevOps Center pipeline.

# description

Provide the URL of an existing repository, or use `--create-repo` with a repository name to create one. After you create the pipeline, add stages, and activate the pipeline.

# flags.target-org.summary

Username or alias of the DevOps Center org.

# flags.name.summary

Name of the pipeline.

# flags.repo.summary

URL of an existing repository or the name of a repository to create.

# flags.repo-type.summary

Type of the source code repository. Required when creating a repository using '--create-repo'.

# flags.create-repo.summary

Create a repository if it doesn't exist.

# flags.repo-owner.summary

Owner (organization or user) of the repository. Required when creating a repository using '--create-repo'.

# flags.bitbucket-project.summary

Bitbucket project key for the repository. Used when creating a Bitbucket repository with '--create-repo'.

# flags.description.summary

Description of the pipeline.

# examples

- Create a pipeline and associate it with an existing GitHub repository.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --name "Release Pipeline" --repo https://github.com/myorg/myrepo

- Create a pipeline and associate it with a new GitHub repository.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --name "Release Pipeline" --repo my-new-repo --repo-type github --repo-owner myorg --create-repo

- Create a pipeline with a description and associate it with a Bitbucket repository.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --name "Release Pipeline" --repo https://bitbucket.org/myorg/myrepo --description "Main CI/CD pipeline for production releases"

# error.RepoTypeRequired

The --repo-type flag is required when using --create-repo. Specify --repo-type github or --repo-type bitbucket.

# error.RepoCreationFailed

Failed to create repository "%s". Verify the --repo-owner has permission to create repositories and the repository name is available. Details: %s

# error.RepoNotFound

Repository "%s" was not found or you don't have access. Verify the repository URL is correct and your DevOps Center org has the required VCS credentials.

# error.RepoValidationFailed

Failed to validate repository "%s". When using an existing repository, provide the full URL (e.g. https://github.com/owner/repo). To create a new repository, use --create-repo with --repo-type and --repo-owner.

# error.RepoOwnerRequired

The --repo-owner flag is required when using --create-repo. Specify the GitHub or Bitbucket organization or user that will own the repository.

# error.VcsCredentialsMissing

No VCS credentials found for repository "%s". Connect to Bitbucket in your DevOps Center org before creating a pipeline.

# error.RepoTypeDetectionFailed

Unable to detect the repository type from the URL "%s". Use --repo-type to specify the repository type.
