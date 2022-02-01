#!/usr/bin/env bash

set -e

tagAndPush() {
  IFS='|'
  read cmd ecr <<< $1
  docker tag $ecr:$CODEBUILD_RESOLVED_SOURCE_VERSION $ecr:latest
  docker push $ecr --all-tags
}

IFS=','
for lambda in $LAMBDAS
do
  IFS='|'
  echo "Building $lambda"
  read cmd ecr <<< $lambda
  echo "Command: $cmd"
  echo "Repo: $ecr"
  docker build . --build-arg cmd=$cmd -t $ecr:$CODEBUILD_RESOLVED_SOURCE_VERSION
done

IFS=','
for lambda in $LAMBDAS
do
  tagAndPush $lambda &
done

wait