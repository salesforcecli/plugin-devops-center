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

Owner (organization or user) of the GitHub repository. Required when creating a GitHub repository using '--create-repo'.

# flags.bitbucket-workspace.summary

Bitbucket workspace that will own the repository. Required when creating a Bitbucket repository using '--create-repo'.

# flags.bitbucket-project-key.summary

Bitbucket project key to associate with the repository. Optional when creating a Bitbucket repository using '--create-repo'.

# flags.description.summary

Description of the pipeline.

# examples

- Create a pipeline and associate it with an existing GitHub repository.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --name "Release Pipeline" --repo https://github.com/myorg/myrepo

- Create a pipeline and associate it with a new GitHub repository.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --name "Release Pipeline" --repo my-new-repo --repo-type github --repo-owner myorg --create-repo

- Create a pipeline and create a new Bitbucket repository.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --name "Release Pipeline" --repo my-new-repo --repo-type bitbucket --bitbucket-workspace myworkspace --bitbucket-project-key PROJ --create-repo

- Create a pipeline with a description and associate it with an existing Bitbucket repository.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --name "Release Pipeline" --repo https://bitbucket.org/myworkspace/myrepo --description "Main CI/CD pipeline for production releases"

# error.RepoTypeRequired

The --repo-type flag is required when using --create-repo. Specify --repo-type github or --repo-type bitbucket.

# error.RepoOwnerNotFound

The repository "%s" could not be initialized because the --repo-owner does not exist or is not accessible on GitHub. Verify the --repo-owner value is a valid GitHub organization or user.

# error.RepoNameAlreadyExists

A repository named "%s" already exists on this account. Choose a different name or use the existing repository URL with --repo instead of --create-repo.

# error.RepoCreationFailed

Failed to create repository "%s". Verify the --repo-owner has permission to create repositories and the repository name is available. Details: %s

# error.RepoNotFound

Repository "%s" was not found or you don't have access. Verify the repository URL is correct and your DevOps Center org has the required VCS credentials.

# error.RepoValidationFailed

Failed to validate repository "%s". When using an existing repository, provide the full URL (e.g. https://github.com/owner/repo). To create a new repository, use --create-repo with --repo-type and --repo-owner.

# error.RepoOwnerRequired

The --repo-owner flag is required when creating a GitHub repository with --create-repo. Specify the GitHub organization or user that will own the repository.

# error.BitbucketWorkspaceRequired

The --bitbucket-workspace flag is required when creating a Bitbucket repository with --create-repo. Specify the Bitbucket workspace that will own the repository.

# error.VcsCredentialsMissing

No VCS credentials found for repository "%s". Connect to Bitbucket in your DevOps Center org before creating a pipeline.

# error.RepoTypeDetectionFailed

Unable to detect the repository type from the URL "%s". Use --repo-type to specify the repository type.
