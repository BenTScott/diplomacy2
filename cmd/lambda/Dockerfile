FROM public.ecr.aws/lambda/provided:al2 as build
# install compiler
RUN yum install wget gzip tar git -y
RUN wget https://go.dev/dl/go1.18beta1.linux-amd64.tar.gz
RUN tar -C /usr/local -xzf go1.18beta1.linux-amd64.tar.gz
ENV PATH="$PATH:/usr/local/go/bin"
RUN go env -w GOPROXY=direct
# cache dependencies
ADD go.mod go.sum ./
RUN go mod download
# build
ADD . .
RUN go build -o /main diplomacy/cmd/lambda
# copy artifacts to a clean image
FROM public.ecr.aws/lambda/provided:al2
COPY --from=build /main /main
ENTRYPOINT [ "/main" ]