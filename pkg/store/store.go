package store

type Keyed interface {
	Key() string
}

type Store[T Keyed] interface {
	Create(obj T) error
	Read(id string) (T, error)
	Delete(id string) error
	Update(obj T) error
}
