tag=$(npm whoami --registry="http://localhost:4873")
echo "tag: $tag"
version=$(jq -r .version package.json)
echo "version: $version"
name=$(jq -r .name package.json)
if [[ $version == *$tag* ]]
  then
    echo "unpublishing previous beta version $version"
    npm unpublish $name@$version --registry=http://localhost:4873
fi
# npm version prerelease --preid="$tag" --no-git-tag-version
# newVersion=$(jq .version package.json)
# echo "publishing new version $newVersion"
# npm publish --tag "$tag" --@tinystacks:registry=http://localhost:4873
