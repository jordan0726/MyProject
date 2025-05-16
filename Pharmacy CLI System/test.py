product = ['apple', 'banana']
quantity = [1, 3]
combine = []
for p, q in zip(product, quantity):
    combine.append(f'{p}, {q}')
combine = ", ".join(combine)
print(combine)


