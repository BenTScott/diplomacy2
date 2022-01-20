package store

type Keyed interface {
	Key() string
}

type DynamoKeyed interface {
	PK() string
	SK() string
}

type Store[T any] interface {
	Create(obj T) error
	Read(id string) (T, error)
	Delete(id string) error
	Update(obj T) error
}
