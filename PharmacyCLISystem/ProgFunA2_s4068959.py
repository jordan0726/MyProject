# Name: Jung-De Chiou
# StudentID: s4068959
# The level I attempted: HD
# Limitation:
    # The name must be unique, otherwise will be considered the same customer regardless the upperclass or lower class
    # If the product name is coincidely startwith 'P' or 'B' and following by integer, the name will be seen as ID.
    # Change reward rate function only for BasicCustomer so far
# Modification:
    # After first time running the program, the customer.txt will add a new attributes for timestamp(the latest update reward time)
    # Option2 "Add/Update information of products" will need to specifiy whether you want to add normal Product or Bundle

import sys
import datetime
#------------- Class of Exception -------------#
class NameAlphabetError(Exception):
    """
    If the user's input name contains other than alphabetic characters, this Exception will be raised.
    """
    def __init__(self, name=''):
        self.message = f"----- ☝︎ Sorry, the input \"{name}\" above is not valid ☝︎ -----\n\n----- ☟ Please re-enter the name only contains alphabets☟ -----"
        super().__init__(self.message)

class CustomerNotExist(Exception):
    
    def __init__(self, invalid_product):
        self.message = f"----- ☝︎ Sorry, the \"{invalid_product}\" above is not exist in the database ☝︎ -----\n\n----- ☟ Please enter again valid customer's name or ID ☟ -----"
        super().__init__(self.message)

class ProductNotFound(Exception):
    """
    If the user's input product not in the product_list, this Exception will be raised.
    """

    def __init__(self, invalid_product):
        self.message = f"----- ☝︎ Sorry, the input \"{invalid_product}\" above is not in the store ☝︎ -----\n\n----- ☟ Please re-enter correct product name or ID☟ -----"
        super().__init__(self.message)

class QuantityNotValid(Exception):
    """
    If the user's input quantity is not positive integer, this Exception will be raised.
    """

    def __init__(self, invalid_quantity):
        self.message = f"----- ☝︎ Sorry, the input \"{invalid_quantity}\" above is not valid ☝︎ -----\n\n----- ☟ Please re-enter ☟ -----"
        super().__init__(self.message)

class AnswerNotValid(Exception):
    pass

class NewRateNotValid(Exception):
    
    def __init__(self, invalid_reward_rate):
        self.message = f"----- ☝︎ Sorry, the input \"{invalid_reward_rate}\" above is not valid ☝︎ -----\n\n----- ☟ Please re-enter ☟ -----"
        super().__init__(self.message)

#------------- Class of Customer -------------#
class Customer:
    last_id = 0 # This is the biggest number of current ID. Use to automatically generate serial ID number.

    def __init__(self, name, ID = None, reward = 0, default_time = datetime.datetime.strptime("01/01/2000 01:00:00", "%d/%m/%Y %H:%M:%S")):
        
        if ID is not None: # if manuly input the ID or load it from the file, it'll directly set the ID
            self.__ID = ID
            id_number = self.extract_number_from_id(ID) #get the numeric part of the ID
            Customer.last_id = max(Customer.last_id, id_number) #get the biggest number in ID now to avoid duplicated ID number
        else:
            Customer.last_id += 1
            self.__ID = f'B{Customer.last_id}'
        
        if not name.isalpha():
            raise NameAlphabetError # propmt customized error message
        else:
            self.__name = name
        self.update_reward_time = default_time.strftime("%d/%m/%Y %H:%M:%S") # Set a default datetime. this attribute will be update to the latest time when changing the reward value, using to avoid incorrect increment of rewards when importing orders.txt
        self.__reward = int(reward)
    
        
    @property
    def ID(self):
        return self.__ID
    
    @property
    def name(self):
        return self.__name
    
    @property
    def reward(self):
        return self.__reward  
    
    @reward.setter
    def reward(self, new_reward):
        self.__reward = new_reward
        # every time the customer's rewards are updated the timestamp will update as well
        self.update_reward_time = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S") #the latest update rewards timestamp in string type
    
    @staticmethod
    def extract_number_from_id(ID):
        """
        extract the numeric part in ID, like if ID = B11 will return 11.
        """
        number = ""
        for char in ID:
            if char.isdigit():
                number += char
        return int(number)

    def get_reward(self):
        pass

    def get_discount(self):
        pass

    def update_reward(self):
        pass

    def display_info(self):
        pass

class BasicCustomer(Customer):
    reward_rate = 1.0

    @staticmethod
    def set_reward_rate(new_reward_rate):
        BasicCustomer.reward_rate = float(new_reward_rate)

    def get_reward(self, total_cost):
        rewards = round(total_cost * self.reward_rate)
        return rewards
    
    def update_reward(self, add_value):
        self.reward += add_value

    def display_info(self):
        print(f"The Customer ID: {self.ID:<6}Name: {self.name:<12}Reward: {self.reward:<4} Reward Rate: {BasicCustomer.reward_rate:<6}")

class VIPCustomer(Customer):
    reward_rate = 1.0
    
    def __init__(self, name, ID, discount_rate = 0.08, reward=0):
        super().__init__(name, ID=ID, reward=reward)
        self.__discount_rate = discount_rate
    
    @staticmethod
    def set_reward_rate(new_rate):
        if isinstance(new_rate, (int, float)):
            VIPCustomer.reward_rate = new_rate
        else:
            raise ValueError('Invalid reward rate. The type should be int or float')
    
    @property
    def discount_rate(self):
        return self.__discount_rate

    def set_discount_rate(self, new_rate):
        if isinstance(new_rate, (int, float)):
            self.__discount_rate = new_rate
        else:
            raise ValueError('Invalid discount rate. The type should be int or float')

    def get_discount(self, total_cost):
        discount = total_cost * self.discount_rate
        return discount
    
    def get_final_total_cost(self, original_cost, discount):
        final_total_cost = original_cost - discount
        return final_total_cost
        
    def get_reward(self, final_total_cost):
        rewards = round(final_total_cost * self.reward_rate)
        return rewards
    
    def update_reward(self, add_value):
        self.reward += add_value

    def display_info(self):
        print(f"The Customer ID: {self.ID:<6}Name: {self.name:<12}Reward: {self.reward:<4} Reward Rate: {VIPCustomer.reward_rate:<6}Discount Rate: {self.discount_rate:>4}")

#------------- Class of Product -------------#
class Product:
    last_id = 0 # This is the biggest number of current ID. Use to automatically generate serial ID number
    
    def __init__(self, ID=None, name='', price=0, prescription = 'n'):
        
        if ID is not None: # if manuly input the ID or load it from the file, it'll directly set the ID
            self.__ID = ID
            id_number = self.extract_number_from_id(ID) #get the numeric part of the ID
            Product.last_id = max(Product.last_id, id_number) #get the biggest number in ID now to avoid duplicated ID number
        else:
            Product.last_id += 1
            self.__ID = f'P{Product.last_id}'

        self.__name = name
        self.__price = price
        self.__prescription = prescription

    @property
    def ID(self):
        return self.__ID
    
    @property
    def name(self):
        return self.__name
    
    @property
    def price(self):
        return self.__price
    
    @price.setter
    def price(self, new_price):
        self.__price = new_price
    
    @property
    def prescription(self):
        return self.__prescription
    
    @prescription.setter
    def prescription(self, new_prescription):
        self.__prescription = new_prescription

    @staticmethod
    def extract_number_from_id(ID):
        """
        extract the numeric part in ID, like if ID = P11 will return 11.
        """
        number = ""
        for char in ID:
            if char.isdigit():
                number += char
        return int(number)

    def display_info(self):
        print(f"The product ID: {self.ID:<8}Name: {self.name:<15}Price: {self.price:<10.2f}Prescription: {self.prescription}")

class Bundle(Product):
    
    def __init__(self, ID=None, name='', contain_prods_id=[], record='', price = 0, prescription = 'n'):
        if ID is None: # Automatically create serial ID startwith B
            Product.last_id += 1
            ID = f'B{Product.last_id}'
        super().__init__(ID, name, price, prescription)
        contain_prods_id = clean_list_blank(contain_prods_id)
        self.__contain_prods_id = contain_prods_id # a list of existing products
        self.record = record
        self.set_price_and_prescription() # set bundle price and prescription requirement

    @property
    def contain_prods_id(self):
        return self.__contain_prods_id
    
    @contain_prods_id.setter
    def contain_prods_id(self, new_contain_prods_id):
        self.__contain_prods_id = new_contain_prods_id

    def set_price_and_prescription(self):
        """
        According to the contain_prods_id, calculate the bundle price and set the prescription attribute
        """
        total_price = 0
        for product_id in self.contain_prods_id:
            product_obj = self.record.find_product(product_id)
            unit_price = product_obj.price
            total_price += float(unit_price)
            if product_obj.prescription == 'y':
                self.prescription = 'y'
        self.price = total_price * 0.8

    def display_info(self):
        print(f"The bundle  ID: {self.ID:<8}Name: {self.name:<15}Components ID: {", ".join(self.contain_prods_id):<18}Price: {self.price:<10.2f}Prescription: {self.prescription}")

#------------- Class of Order -------------#
class Order:
    
    product_field_width = 0 #when printing, this attribute will be used to adjust the width of product x quantity column

    def __init__(self, cus_name_or_ID, products, quantity, final_total_cost, earned_rewards, date, record):
        self.record = record # import record object to use find function

        if (cus_name_or_ID.lower().startswith('b') or cus_name_or_ID.lower().startswith('v')) and cus_name_or_ID[1:].isnumeric():
                customer_id = cus_name_or_ID # The system determines that the input is Custoemr ID
                customer_obj = self.record.find_customer(customer_id)
                try:
                    if customer_obj is None: # means cannot find corresponding customer info in database
                        raise CustomerNotExist(customer_id)
                    cus_name_or_ID = customer_obj.name # if the ID is valid then return the corresponding customer name
                except CustomerNotExist as e :
                    print(e)
        
        self.__customer_name = cus_name_or_ID

        for index, product in enumerate(products):
            product_obj = self.record.find_product(product)
            products[index] = product_obj.name # replace the ID to product name

        self.__products = products #product list
        self.__quantity = quantity #index-corresponding quantity list
        self.__final_total_cost = float(final_total_cost)
        self.__earned_rewards = int(earned_rewards)

        self.__original_total_cost = 0 #need to use compute_cost function to update
        self.__discount = 0 #need to use compute_cost function to update

        self.__date = date 
        self.__product_quantity = []
        for p, q in zip(self.products, self.quantity):
            self.product_quantity.append(f"{q} x {p}") #store product x quantity format

        Order.get_max_product_field_width(self.record) # update the max width of "product x quantity" column

    @staticmethod
    def get_max_product_field_width(record):
        for order in record.order_list: 
            each_order_product_field_width = ", ".join(order.product_quantity) # Join them to to calculate the total width that will be printed out in theproduct column, like "1 x vitaminC, 2 x vaccine"
            order.product_field_width = len(each_order_product_field_width)
            Order.product_field_width = max(Order.product_field_width, order.product_field_width) # calculate the strings width and store the max one

    @property 
    def customer_name(self):
        return self.__customer_name
    
    @property
    def products(self):
        return self.__products
    
    @property
    def quantity(self):
        return self.__quantity
    
    @property
    def original_total_cost(self):
        return self.__original_total_cost
    
    @original_total_cost.setter
    def original_total_cost(self, new_total_cost):
        self.__original_total_cost = new_total_cost

    @property
    def discount(self):
        return self.__discount
    
    @discount.setter
    def discount(self, new_discount):
        self.__discount = new_discount

    @property
    def final_total_cost(self):
        return self.__final_total_cost
    
    @final_total_cost.setter
    def final_total_cost(self, new_final_total_cost):
        self.__final_total_cost = new_final_total_cost

    @property
    def earned_rewards(self):
        return self.__earned_rewards
    
    @earned_rewards.setter
    def earned_rewards(self, new_rewards):
        self.__earned_rewards = new_rewards

    @property
    def date(self):
        return self.__date
    
    @property
    def product_quantity(self):
        return self.__product_quantity
    
    def display_info(self):
        print(f"Customer Name/ID: {self.customer_name:<10}Products: {", ".join(self.product_quantity):<{Order.product_field_width + 3}}Total Cost: {self.final_total_cost:<8.2f}\tRewards: {self.earned_rewards}\t Time: {self.date}")
    
    def compute_cost(self):
        
        customer_obj = self.record.find_customer(self.customer_name)
        
        #calculate total cost
        total_cost = 0
        for product, each_quantity in zip(self.products, self.quantity): #combine product list and quantity list to print them respetively.
            target_product = self.record.find_product(product) # Go to product_list database to return the product object the customer purchase
            unit_price = target_product.price 
            item_total = unit_price * int(each_quantity) # Calculate this item's cost
            total_cost += item_total # Accumulate every item's cost to get the total cost of this purchase

        if isinstance(customer_obj, (BasicCustomer, type(None))):
            earned_reward = round(total_cost * float(BasicCustomer.reward_rate))
            self.final_total_cost = total_cost

        elif isinstance(customer_obj, VIPCustomer):
            discount = customer_obj.get_discount(total_cost) 
            discounted_total_cost = customer_obj.get_final_total_cost(total_cost, discount)
            earned_reward = customer_obj.get_reward(discounted_total_cost)
            self.final_total_cost = discounted_total_cost # update the final_total_cost attribute
            self.discount = discount
        
        self.original_total_cost = total_cost
        self.earned_rewards = earned_reward

    def copy(self):
        """
        copy a identical order object, using in first time import order.txt(Record.read_order_file)
        """
        return Order(self.__customer_name, self.__products[:], self.__quantity[:],self.__final_total_cost,self.__earned_rewards,self.__date,self.record)
        

#------------- Class of Record -------------#
class Record:
    """
    A database to manage customers and products' data.
    """
    def __init__(self):
        self.customer_list = []
        self.product_list = [] # store products which ID startwith 'P'
        self.bundle_list = [] # store products which ID startwith 'B'
        self.order_list = []

    @property # Dynamically merge and return the latest product_list and bundle_list each time all_product_list is accessed
    def all_product_list(self):
        return self.product_list + self.bundle_list

    def read_customers(self, file_name):
        try:
            with open(file_name, 'r') as file:
                line = file.readline()
                while line: # loop until the line become empty
                    fields_line = line.strip().split(",")
                    if "b" in fields_line[0].lower():
                        customer_data = BasicCustomer(fields_line[1].strip(),fields_line[0], int(fields_line[3].strip()))
                        BasicCustomer.reward_rate = float(fields_line[2].strip())
                        if len(fields_line) > 4:
                            customer_data.update_reward_time = fields_line[4].strip()
                    elif "v" in fields_line[0].lower():
                        customer_data = VIPCustomer(fields_line[1].strip(),fields_line[0],float(fields_line[3].strip()), int(fields_line[4].strip()))
                        if len(fields_line) > 5:
                            customer_data.update_reward_time = fields_line[5].strip()
                    self.customer_list.append(customer_data)
                    line = file.readline()
                return file_name
        except FileNotFoundError:
            print(f"\n ❗️ Cannot find the file \"{file_name}\" for customers data ❗️ ")
            print("Please check the local folder again to successfully launch the program")
            sys.exit(1) # When cannot load the file, the program will stop

    def read_products(self, file_name):
        try:
            with open(file_name, 'r') as file:
                line = file.readline()
                while line: 
                    fields_line = line.strip().split(",")
                    if fields_line[0].lower().startswith('p'):
                        product_obj = Product(fields_line[0], fields_line[1].strip(), float(fields_line[2].strip()), fields_line[3].strip())
                        self.product_list.append(product_obj)
                    elif fields_line[0].lower().startswith('b'):
                        product_obj = Bundle(fields_line[0],fields_line[1].strip(),fields_line[2:], self)
                        self.bundle_list.append(product_obj)
                    line = file.readline()
                return file_name

        except FileNotFoundError:
            print(f"\n ❗️ Cannot find the file \"{file_name}\" for products data ❗️ ")
            print("Please check the local folder again to successfully launch the program")
            sys.exit(1)

    def read_orders(self, file_name, is_default=False):
        try:
            input_orders = [] # temperally store duplicated order object to do some actions
            with open(file_name, 'r') as file:
                line = file.readline()
                while line:
                    fields_line = line.strip().split(",")
                    clean_list_blank(fields_line)
                    fields_line_index = len(fields_line) - 1
                    order_obj = Order(fields_line[0], fields_line[1:fields_line_index-2:2], fields_line[2:fields_line_index-2:2], fields_line[fields_line_index-2], fields_line[fields_line_index-1], fields_line[fields_line_index], self)
                    input_orders.append(order_obj.copy()) #copy a identical order object to avoid affect the original one
                    self.order_list.append(order_obj)
                    line = file.readline()

            # first time import orders.txt. If there're any order in the txt is from the same customer, merge their rewards to correctly increment into customer's rewards
            same_customer_order = {}
            for index, order_obj in enumerate(input_orders):
                if order_obj.customer_name in same_customer_order:
                    same_customer_order[order_obj.customer_name].earned_rewards += order_obj.earned_rewards #add the latter same order's rewards to the former one
                    del input_orders[index] #remove the latter same customer_name order object
                else:
                    same_customer_order[order_obj.customer_name] = order_obj
            
            # compare the timestmap, if the order's is newer than the customer's latest update reward time, incrementing customer's rewards by the order's rewards value
            for order_obj in input_orders:
                customer_obj = self.find_customer(order_obj.customer_name)
                customer_time = datetime.datetime.strptime(customer_obj.update_reward_time, '%d/%m/%Y %H:%M:%S') #transform format
                customer_time = int(customer_time.strftime("%Y%m%d%H%M%S")) #turn into str type,then int to compare
                order_time = datetime.datetime.strptime(order_obj.date, '%d/%m/%Y %H:%M:%S') #transform format
                order_time = int(order_time.strftime("%Y%m%d%H%M%S")) #turn into str type,then int to compare
                if customer_time < order_time:
                    customer_obj.reward += order_obj.earned_rewards
        
            return file_name
        
        except FileNotFoundError:
            if is_default:
                print(f"\n ❗️ Cannot find the default file \"{file_name}\" for orders data, continuing without orders ❗️ \n")
                return file_name # return "orders.txt"
            else:
                print(f"\n ❗️ Cannot find the file \"{file_name}\" for orders data ❗️ ")
                print("Please check the local folder again to successfully launch the program")
                sys.exit(1)

    def find_customer(self, search_value):
        search_value = search_value.lower()
        for customer in self.customer_list:
            if search_value == customer.ID.lower() or search_value == customer.name.lower():
                return customer
        return None

    def find_product(self, input_product):
        """
        find corresponding products in product_list(database)
        """
        input_product = input_product.lower()
        for product in self.all_product_list:
            if input_product == product.ID.lower() or input_product == product.name.lower():
                return product
        return None 

    def find_order(self, search_value):
        search_value = search_value.lower()
        for order in self.order_list:
            if search_value == order.customer_name.lower():
                yield order    

    def update_product_info(self):
        while True:
            user_answer = input("Do you want to add/update normal product or bundle(please answer 'p' or 'b'):\n").lower()
            
            if user_answer == 'p':
                # Check the user's input is valid; otherwise, keep asking until valid answers are inputted
                loop_var = True
                while loop_var:
                    print("Entering the information of products you want to add or update in valid format as shown below:")
                    try:
                        input_product_info = input("[Name Price Prescription] --> [e.g. toothpaste 5.2 n, apple 3.0 n]\n").strip().split(",")
                        clean_list_blank(input_product_info) # clean the blank space between units

                        # sperate user's inputs into different catagories to proceed respective validity checking
                        product_names = []
                        unit_prices = []
                        dr_prescriptions = []
                        invalid_inputs = [] #if the value is invalid, it will be put into this list
                        for unit in input_product_info:
                            items = unit.split()
                            product_names.append(items[0])
                            unit_prices.append(items[1])
                            dr_prescriptions.append(items[2])

                        # If input product name is ID, turn all the ID into corresponding product name
                        for index, product in enumerate(product_names):
                            if product.lower().startswith('p') and product[1:].isnumeric(): #the input is ID
                                product_obj = self.find_product(product)
                                
                                if product_obj is None:
                                    invalid_inputs.append(product)
                                else:    
                                    product_names[index] = product_obj.name
 

                    except IndexError: # if users input in wrong format, like apple 4, orange
                        print(" ☞ The format is wrong. Please re-enter valid input! ☜\n")
                        print("-" * 50)

                    else: # if format is valid, then check each input's validity

                        # check whether input prices are invalid, negative or zero
                        for item in unit_prices:
                            try:
                                float_item = float(item)
                                if float_item <= 0:
                                    invalid_inputs.append(item)
                            except ValueError:
                                invalid_inputs.append(item)

                        # check whether inputs in dr_prescription are valid
                        for item in dr_prescriptions:
                            if not (item == "y" or item == "n"):
                                invalid_inputs.append(item)
                        
                        # if having invalid input, print the error message to ask user re-enter valid input
                        if invalid_inputs: 
                            invalid_inputs = ", ".join(invalid_inputs)
                            print(f" -----☝︎ Sorry, the input \"{invalid_inputs}\" above is not valid ☝︎-----\n\n----- ☟ Please re-enter ☟ -----")
                        else:  # If all input are valid, adding/updating new product info to Product dictionary database
                            for index, product_name in enumerate(product_names): # apple, vitaminC
                                bundle_obj = self.find_product(product_name)
                                if bundle_obj is None: # means the product not exists, the user wants to add new one.
                                    self.product_list.append(Product(None, product_name, float(unit_prices[index]), dr_prescriptions[index]))
                                else: # means the product already exists, the user wants to update it.
                                    bundle_obj.price = float(unit_prices[index])
                                    bundle_obj.prescription = dr_prescriptions[index]
                            loop_var = False # end the loop

                            return print("☝︎ The products info are successfully added/updated!!! ☝︎ \n☟ Backing to Menu ☟ \n")

            elif user_answer == 'b':
                loop_var = True
                while loop_var:
                    print("Entering the information of bundle you want to add or update in valid format as shown below:")
                    
                    input_bundle_info = input("[Name ContainingProductID] --> [e.g. tablet P4 P7, DailySpecial P1 P2 P5 P7]\n").strip().split(",")
                    
                    clean_list_blank(input_bundle_info) # clean the blank space behind the ","

                    bundle_names = []
                    contain_products_ids = []
                    invalid_inputs = [] #if the value is invalid, it will be put into this list
                    index_validity = True

                    for unit in input_bundle_info:
                        items = unit.split()

                        try:
                            if len(items) < 3: # if users input in wrong format, like tablet, DailySpecial
                                raise IndexError
                        except IndexError:
                            index_validity = False
                            invalid_inputs.append(items[0])
                        else:
                            # Check all the contained products IDs are valid(existing in the database)
                            PID_list = items[1:]
                            for index, product_id in enumerate(PID_list):
                                finding_result = self.find_product(product_id)
                                if finding_result is None or isinstance(finding_result, Bundle):
                                    invalid_inputs.append(product_id)
                                else:
                                    product_id = product_id.upper()
                                    PID_list[index] = product_id
                            bundle_names.append(items[0])
                            contain_products_ids.append(PID_list)
                        
                    # If input bundle name is ID, turn all the ID into corresponding product name
                    for index, bundle in enumerate(bundle_names):
                        if bundle.lower().startswith('b') and bundle[1:].isnumeric(): #the input is ID
                            bundle_obj = self.find_product(bundle)

                            if bundle_obj is None:
                                invalid_inputs.append(bundle)
                            else:    
                                bundle_names[index] = bundle_obj.name

                        
                    if invalid_inputs and index_validity: #if format is correct but some inputs are invalid
                        invalid_inputs = ", ".join(invalid_inputs)
                        print(f"-----☝︎ Sorry, the input \"{invalid_inputs}\" above is not valid ☝︎-----\n\n----- ☟ Please re-enter ☟ -----")
                    elif not index_validity: # The format is incorrect 
                        print(f"-----☝︎ Sorry, the format of \"{invalid_inputs[0]}\" is wrong. A bundle should at least have two products ☝︎-----\n\n----- ☟ Please re-enter! ☟ -----")
                        print("-" * 50)
                    else: # all input are valid
                        for b_name, c_p_id in zip(bundle_names, contain_products_ids):
                            bundle_obj = self.find_product(b_name)
                            if bundle_obj is None: # means the bundle not exists, the user wants to add new one.
                                self.bundle_list.append(Bundle(None, b_name, c_p_id, self))
                            else: # means the bundle already exists, the user wants to update it.
                                bundle_obj.contain_prods_id = c_p_id
                            
                        return print("\n☝︎ The bundles info are successfully added/updated!!! ☝︎ \n☟ Backing to Menu ☟ \n")
                            
            else:
                print(AnswerNotValid("-----☝︎ Please enter valid answer('p' or 'b') ☝︎-----\n\n----- ☟ Please re-enter ☟ -----"))

    def list_customer(self):
        for customer in self.customer_list:
            if isinstance(customer, BasicCustomer):
                customer.display_info()
            elif isinstance(customer, VIPCustomer):
                customer.display_info()

    def list_product(self):
        for product in self.all_product_list:
            if isinstance(product, Product):
                product.display_info()
            elif isinstance(product, Bundle):
                product.display_info()

    def list_order(self):

        Order.get_max_product_field_width(self) # initialize the static variable -- product_field_width's max width among all orders

        for order in self.order_list:
            order.display_info()

#------------- Class of Operations-------------#    
class Operations:
    
    def menu(self):
        """
        Print Menu and let users select what they want to do.
        Using WhileLoop to repeat menu function after finishing a selected option.
        """
        while True:
            print("#" * 60)
            print("Menu".center(60))
            print("You can choose from the following options:")
            print("1: Make a purchase")
            print("2: Add/Update information of products")
            print("3: Display existing customers")
            print("4: Display existing products")
            print("5: Display all orders")
            print("6: Display a customer order history")
            print("7: Adjust the reward rate of all Basic customers")
            print("8: Adjust the discount rate of a VIP customer")
            print("0: Exit the program")
            print("#" * 60)
            user_options = input("Choose one option: ")

            # Check user input valid options
            if user_options == "1":
                self.purchase_product()
            elif user_options == "2":
                self.add_update_product_info()
            elif user_options == "3":
                self.print_customer_info()
            elif user_options == "4":
                self.print_product_info()
            elif user_options == "5":
                self.print_order_info()
            elif user_options == "6":
                self.print_customer_order_history()
            elif user_options == "7":
                self.adjust_basic_customer_reward_rate()
            elif user_options == "8":
                self.adjust_VIP_discount_rate()
            elif user_options == "0":
                print("\n" + "-" * 10 + "☞ Exit the program ☜" + "-" * 10 + "\n")
                break #exit the program 
            else:
                print("----- ☝︎Please enter options included above. ☝︎-----\n\n----- ☟ Please re-enter ☟ -----")

    def load_files(self, default_customer_file, default_product_file, default_order_file):
        """
        Load the customer and product data from outer files at the beginning of the code.
        """
        self.record = Record()

        args = sys.argv[1:] # read the name from command line exclude this file name itself

        if len(args) == 0:
            customer_file = self.record.read_customers(default_customer_file)
            product_file = self.record.read_products(default_product_file)
            order_file = self.record.read_orders(default_order_file, True) # parameter 'True' is to tell read_order function that this is default mode. If cannot find orders.txt is ok to proceed the program.
            return customer_file, product_file, order_file 
        
        elif len(args) == 2:
            customer_file = args[0]
            product_file = args[1]
            customer_file = self.record.read_customers(customer_file)
            product_file = self.record.read_products(product_file)
            order_file = default_order_file #The user didn't indicate order file, so use default one for restoring data after terminating the program
            return customer_file, product_file, order_file
        
        elif len(args) == 3:
            customer_file = args[0]
            product_file = args[1]
            order_file = args[2]
            customer_file = self.record.read_customers(customer_file)
            product_file = self.record.read_products(product_file)
            order_file = self.record.read_orders(order_file)  
            return customer_file, product_file, order_file    

        else:
            print("\nThe number of arguments is incorrect.")
            print("Please provide 'customer', 'product', and 'order'(optional) file name")
            print("If no file name provided, the system will look for 'customers.txt', 'products.txt', and 'orders.txt' in the local directory\n")
            sys.exit(1) # stop running the program

    def purchase_product(self):
        """
        If user choose option 1, then this function will be run.
        Let users input their name, purchasing products, quantity and print receipt to them
        """
        print("\n" + "-" * 20 + "Make a purchase" + "-" * 20)
        customer_name = self.input_name_or_id() #customer-name-input function
        input_product_list = self.input_product() #customer-product-input function
        input_product_list = self.check_product_prescription(input_product_list) #check whether need prescription
        
        # Check whether the product list still has items after remove unqualified products if customers don't have prescription
        if input_product_list: # if have items in the list
            print(f"\n 📜 Your current purchasing product list: {input_product_list}")
            product_quantity = self.quantity_input(input_product_list) 
            target_customer = self.record.find_customer(customer_name) #retrieve the customer's object see if it's in the database
            earned_reward = self.receipt(target_customer, customer_name, input_product_list, product_quantity)
            self.update_cus_info(target_customer, earned_reward, customer_name)
            print("☟ Backing to Menu ☟ \n")
        else: # if the product list is empty
            print("❗️ Remember to get a prescription from your doctor!")
            print(" ☟ Backing to Menu ☟ \n")

    def add_update_product_info(self):
        """
        If user choose option 2
        Let user add/update product's name, unit price, and doctor prescription
        """

        print("\n" + "-" * 10 + "Add/Update information of products" + "-" * 10 + "\n")

        self.record.update_product_info()

    def print_customer_info(self):
        print("-"*90)
        print("Customer list".center(90))
        print("-"*90)
        self.record.list_customer()
        print("-"*90)
        print(" ☟ Backing to Menu ☟ \n")

    def print_product_info(self):
            print("-"*65)
            print("Product list".center(65))
            print("-"*65)
            self.record.list_product()
            print("-"*65)
            print(" ☟ Backing to Menu ☟ \n")

    def print_order_info(self):
        print("-"*65)
        print("History Orders".center(65))
        print("-"*65)
        self.record.list_order()
        print("-"*65)
        print(" ☟ Backing to Menu ☟ \n")

    def print_customer_order_history(self):

        print("\n" + "-" * 20 + "Display a customer order history" + "-" * 20)

        while True:
            cust_name_or_ID = input("Which customer's order history you want to search for(name or ID):\n")
            customer_obj = self.record.find_customer(cust_name_or_ID)
            try:
                if customer_obj is None:
                    raise CustomerNotExist(cust_name_or_ID)
                else:
                    customer_name = customer_obj.name
                    matching_orders = list(self.record.find_order(customer_name))

                    if matching_orders: # the customer have order history
                        # Get the max width among this customer's orders
                        Order.product_field_width = 0
                        for order_obj in matching_orders: 
                            each_order_product_field_width = ", ".join(order_obj.product_quantity) # Join them to to calculate the total width that will be printed out in theproduct column, like "1 x vitaminC, 2 x vaccine"
                            order_obj.product_field_width = len(each_order_product_field_width)
                            Order.product_field_width = max(Order.product_field_width, order_obj.product_field_width) # calculate the strings width and store the max one

                        print("\n" + "-" * 10 + f"📝 This is the order history of \"{customer_name}\" 📝" + "-" * 10)
                        print(("▼ " * 20).center(60))
                        print(" ".ljust(10) + "Product".ljust(Order.product_field_width + 3) + "Total Cost".ljust(15) + "Earned Rewards")
                        for order_number, order_obj in enumerate(matching_orders):
                            print(f"{f'order {order_number + 1}':<10}{", ".join(order_obj.product_quantity):<{Order.product_field_width + 3}}{order_obj.final_total_cost:<15.2f}{order_obj.earned_rewards:<10}")
                        print(("▲ " * 20).center(60))
                    else: #the customer didn't have any order history
                        print("\n" + "-" * 10 + f" \"{customer_name}\" hasn't had any order history " + "-" * 10)
                        print("\n" + "-" * 10 + "☟ Backing to Menu ☟" + "-" * 10 + "\n")

                    break

            except CustomerNotExist as e:
                print(e)

    def adjust_basic_customer_reward_rate(self):
        """
        If user choose option 5, then this function will be run.
        Let users input new reward rate for all Basic Customer
        """
        
        print("\n" + "-" * 20 + "Adjust the reward rate of all Basic customers" + "-" * 20)
        
        while True:
            new_reward_rate = input("Enter the new reward rate for all Basic Customers(e.g. '1.2' or '0.8'):\n")

            # Check input validity, it can't be non-number or 0 or negative
            try:
                try:
                    float_new_reward_rate = float(new_reward_rate)
                    if float_new_reward_rate <= 0:
                        raise NewRateNotValid(new_reward_rate)
                    BasicCustomer.set_reward_rate(float_new_reward_rate)
                    return print(f"\n ☝︎ The new reward rate \"{new_reward_rate}\" has been set to all Basic Customers ☝︎ \n ☟ Backing to Menu ☟ \n")
                except ValueError:
                    raise NewRateNotValid(new_reward_rate)
            except NewRateNotValid as e:
                print(e)

    def adjust_VIP_discount_rate(self):
        """
        If user choose option 6, then this function will be run.
        Let users input new discount rate for the certain VIP Customer
        """
        
        print("\n" + "-" * 20 + "Adjust the discount rate of a VIP customer" + "-" * 20)
        
        while True:
            try:
                customer_name_or_id = input("Enter the name or ID of the VIP customer you want to update(e.g 'Tom' or 'V3'):\n")
                customer_obj = self.record.find_customer(customer_name_or_id)
                if isinstance(customer_obj, BasicCustomer):
                    raise AnswerNotValid
                elif customer_obj is None: # means the input customer'a name or ID doesn't exist in the database
                    raise CustomerNotExist(customer_name_or_id)
                print(f"\n 📈 The VIP Customer's current discount rate is \"{customer_obj.discount_rate}\"\n")
                break
            except CustomerNotExist as e:
                print(e)

            except AnswerNotValid:
                print("----- ☝︎ Sorry, the customer is Basic Customer. They don't have discount rate. ☝︎ -----\n\n----- ☟ Please re-enter ☟ -----\n")

        while True:
            new_discount_rate = input(f"Enter the new discount rate for {customer_obj.name}(e.g. '0.2' or '0.8'):\n")
            
            # Check input validity, it can't be non-number or 0 or negative
            try:
                try:
                    float_new_reward_rate = float(new_discount_rate)
                    if float_new_reward_rate <= 0 or float_new_reward_rate > 1: # discount rate can't exceed 1
                        raise NewRateNotValid(new_discount_rate)
                    customer_obj.set_discount_rate(float_new_reward_rate)
                    return print(f"\n ☝︎ The new discount rate \"{new_discount_rate}\" has been set to the VIP Customer \"{customer_obj.name}\" ☝︎ \n ☟ Backing to Menu ☟ \n")
                except ValueError:
                    raise NewRateNotValid(new_discount_rate)
            except NewRateNotValid as e:
                print(e)

    def write_in_files(self, customer_file, product_file, order_file):
        with open(customer_file, 'w') as file:
            for customer_obj in self.record.customer_list:
                if isinstance(customer_obj, BasicCustomer):
                    file.write(f"{customer_obj.ID}, {customer_obj.name}, {BasicCustomer.reward_rate}, {customer_obj.reward}, {customer_obj.update_reward_time}\n") #will write additional update reward time info
                elif isinstance(customer_obj, VIPCustomer):
                    file.write(f"{customer_obj.ID}, {customer_obj.name}, {VIPCustomer.reward_rate}, {customer_obj.discount_rate}, {customer_obj.reward}, {customer_obj.update_reward_time}\n") #will write additional update reward time info
        
        with open(product_file, 'w') as file:
            for product_obj in self.record.all_product_list:
                if isinstance(product_obj, Product) and not isinstance(product_obj, Bundle):
                    file.write(f"{product_obj.ID}, {product_obj.name}, {product_obj.price}, {product_obj.prescription}\n")
                elif isinstance(product_obj, Bundle):
                    file.write(f"{product_obj.ID}, {product_obj.name}, {", ".join(product_obj.contain_prods_id)} \n")
        
        with open(order_file, 'w') as file:
            for order_obj in self.record.order_list:
                combine = []
                for p, q in zip(order_obj.products, order_obj.quantity):
                    combine.append(f"{p}, {q}")
                combine = ", ".join(combine)
                file.write(f"{order_obj.customer_name}, {combine}, {order_obj.final_total_cost:.2f}, {order_obj.earned_rewards}, {order_obj.date}\n")
        
    ##------------ Menu function 1 (Purchase_product) Details ------------##
    def input_name_or_id(self):
        '''
        Display prompt and let users input customer's name or ID
        '''
        while True:
            cust_name_or_id = input("Please enter the customer's name or ID [e.g. Jordan or B11]:\n")

            # Distinguise whether the input is ID or name
            # If the input startwith b or v and following by digits, then it is ID
            if (cust_name_or_id.lower().startswith('b') or cust_name_or_id.lower().startswith('v')) and cust_name_or_id[1:].isnumeric():
                customer_id = cust_name_or_id # The system determines that the input is Custoemr ID
                customer_obj = self.record.find_customer(customer_id)
                try:
                    if customer_obj is None: # means cannot find corresponding customer info in database
                        raise CustomerNotExist(customer_id)
                    print(f" 👀 Your customer name is \"{customer_obj.name}\" 👀")
                    return customer_obj.name # if the ID is valid then return the corresponding customer name
                except CustomerNotExist as e :
                    print(e)
            else: # If the user input Custoemr Name
                customer_name = cust_name_or_id
                try:
                    if not customer_name.isalpha(): # if the input contains other than alphabets, the user needs to re-enter
                        raise NameAlphabetError(customer_name)
                    return customer_name[0].upper() + customer_name[1:] # Input is valid return the customer name
                except NameAlphabetError as e:
                    print(e)
                  
    def input_product(self):
        '''
        Display prompt and inputing the product customer bought
        '''
        while True:
            input_product_list = input("\nEntering the product name or ID (valid inoput and format only, e.g. vitaminC, coldTablet, P3):\n").strip().split(",")
            
            # Use the function in the "### other small function ###" section below to Clean the space between each product
            input_product_list = clean_list_blank(input_product_list)
            
            #If user inputs product ID, convert them into corresponding product name
            invalid_input = [] # If there is any invalid input, they will be put in this list
            for index, name_or_id in enumerate(input_product_list):
                # if the input startwith p or b and following by digits 
                if (name_or_id.lower().startswith('p') or name_or_id.lower().startswith('b')) and name_or_id[1:].isnumeric():
                    product_id = name_or_id
                    product_obj = self.record.find_product(product_id)
                    if product_obj is None: # means cannot find corresponding product info in database
                        invalid_input.append(product_id)
                        input_product_list.remove(product_id)
                    else: # if can find corresponding product
                        if product_obj.name.lower() in input_product_list: # check if user enters the same product's name and ID
                            print(f"-----☞ The {product_id} and {product_obj.name} is the same product! The system will remove it from purchasing product list ☜-----")
                            input_product_list.remove(product_id)
                        else:
                            input_product_list[index] = product_obj.name # Convert the valid ID into its corresponding product name
            
            # Check whether there is any invalid input product
            for index, input_product in enumerate(input_product_list):
                product_obj = self.record.find_product(input_product)
                if product_obj is None: #Can't find the input product
                    invalid_input.append(input_product)
                else: # if the product can be found in database
                    input_product_list[index] = product_obj.name # If the input is in lowercase, like vitaminc, it's still valid, but will be changed into correct name in product DBs, like vitaminC.

            # Let user re-enter if there is invalid input.
            try:
                if invalid_input:
                    invalid_product = ", ".join(invalid_input) # Make the invalid input as a series string
                    raise ProductNotFound(invalid_product)
                return input_product_list
            except ProductNotFound as e:
                print(e)

    def check_product_prescription(self, input_product_list):
        """
        Go through products the user inputted to check whether they need doctor prescriptions and ask them whether they have or not.
        """
        need_prescription = [] # The products need prescription will be put in this list

        # Check what input products need prescription
        for product in input_product_list:
            product_obj = self.record.find_product(product) #get the exact product's info to check it's prescription attribute
            if product_obj.prescription == 'y':
                need_prescription.append(product)

        # Check user whether they have doctor's prescription
        if need_prescription: # If there is any product needs prescription, prompt the query
            while True:
                # Tell users what products need prescriptions.
                need_prescription_txt = ", ".join(need_prescription) 
                prescription_answer = input(f"\nThe product \"{need_prescription_txt}\" need doctor's prescription, do you have one? (please answer 'n' or 'y')\n")
                # Check customers' answer to see whether they can buy the prescription-needed products.
                if prescription_answer == "n":
                    print(f"❗️ Sorry, {need_prescription_txt} can’t be purchased without prescription. The products will be removed.")
                    for items in need_prescription:
                        input_product_list.remove(items) #remove items that cannot be purchased
                    return input_product_list
                elif prescription_answer == "y": # If have prescription, ending the loop to proceed
                    return input_product_list
                else:
                    print(AnswerNotValid("-----☝︎ Please enter valid answer('n' or 'y') ☝︎-----\n\n----- ☟ Please re-enter ☟ -----")) # if they answer other than y or n, asking them to re-enter
        
        return input_product_list

    def quantity_input(self, input_product_list):
        """
        Let user input the quantity of product and check whether the answer is valid.
        """
        while True:
            input_quantity = input("\nEntering the quantity of the product [positive integer only, e.g. 2, 1, 6]:\n").strip().split(",")
            
            # Clean the blank
            input_quantity = clean_list_blank(input_quantity)
            
            # Turn input quantity into integer to calculate later
            converted_quantity = []
            invalid_input = []

            for qty in input_quantity:
                try: 
                    int_qty = int(qty)
                    if int_qty <= 0: # if the quantity is 0 or negative add it to invalid_input list
                        invalid_input.append(qty)
                    else:
                        converted_quantity.append(int_qty)
                except ValueError: # if the quantity cannot turn into integer add it to invalid_input list
                    invalid_input.append(qty)

            try: # if invalid_input has items raise QuantityNotValid Exception
                if invalid_input: 
                    invalid_quantity = ", ".join(invalid_input)
                    raise QuantityNotValid(invalid_quantity)
                if len(input_product_list) != len(input_quantity):
                    print("----- ☝︎ The number of quantity does not match the number of products. ☝︎ -----\n\n----- ☟ Please re-enter the quantity ☟ -----")
                else:
                    return converted_quantity
            except QuantityNotValid as e:
                print(e)      

    def store_order(self, customer_name, input_product_list, product_quantity):
        """
        After succed purchasing, store the order data for the customer.
        """
        order = Order(customer_name, input_product_list, product_quantity, 0, 0, datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),self.record)
        order.compute_cost() # update final_total_cost earned_rewards discount original_total_cost attributes
        self.record.order_list.append(order)
        return order #return order object to proceed print receipt

    def receipt(self, target_customer, customer_name, input_product_list, product_quantity):
        """
        Base on the input of customer's name, product and quantity, print out the total cost and reward to user
        After print out receipt, the system will update the new rewards and record this order history
        """
        if isinstance(target_customer, (BasicCustomer, type(None))): # if the cus doesn't exist in the DBs, the target_customer will be None but we need to consider them as Basic cus.
            print("🎉 Welcome Basic Customer 🎉".center(60))
        else:
            print("🎊🎊 Welcome VIP Customer 🎊🎊".center(60))
        #print receipt title
        print("-"*60)
        print("Receipt".center(60))
        print("-"*60)
        print("Name:".ljust(15) + f"{customer_name}")

        order_obj = self.store_order(customer_name, input_product_list, product_quantity)
        
        # print every product's info
        for product, quantity in zip(order_obj.products, order_obj.quantity): #combine product list and quantity list to print them respetively.
            target_product = self.record.find_product(product) # Go to product_list database to return the product object the customer purchase
            unit_price = target_product.price
            print("Product:".ljust(15) + f"{product}")
            print("Unit Price:".ljust(15) + f"{unit_price:.2f} (AUD)")
            print("Quantity:".ljust(15) + f"{quantity}")
        print("-"*60)
 
        reward_discount = 0
        if target_customer is not None: # if the customer is existing, then check the rewards
            while target_customer.reward > 100 and order_obj.final_total_cost >= 10:# Check whether database have customer's data, avoiding error
                # if have reward data and rewards > 100, deduct 10$ from the final total cost
                # Using 'final_total_cost >= 10' is to avoid some situations that customers have large amount of rewards and make little purchase,
                # so that the final_total_cost won't become negative number
                reward_discount += 10
                order_obj.discount += 10
                target_customer.reward -= 100
                order_obj.final_total_cost -= 10 # update the final total cost

        if isinstance(target_customer, (BasicCustomer, type(None))):
            print("Original cost:".ljust(20) + f"{order_obj.original_total_cost:.2f} (AUD)")
            print("Reward discount:".ljust(20) + f"{order_obj.discount:.2f} (AUD)")
            print("Total cost:".ljust(20) + f"{order_obj.final_total_cost:.2f} (AUD)")
            print("Earned reward:".ljust(20) + f"{order_obj.earned_rewards}")
            print("-"*60)

        elif isinstance(target_customer, VIPCustomer):
            print("Original cost:".ljust(20) + f"{order_obj.original_total_cost:.2f} (AUD)")
            print("Discount:".ljust(20) + f"{order_obj.discount:.2f} (AUD)(include Reward Discount)")
            print("Total cost:".ljust(20) + f"{order_obj.final_total_cost:.2f} (AUD)")
            print("Earned reward:".ljust(20) + f"{order_obj.earned_rewards}")
            print("-"*60)
            
        return order_obj.earned_rewards #return rewards data to proceed the next step, updating customers' current reward points.
    
    def update_cus_info(self, target_customer, earned_reward, customer_name):
        if target_customer: #if customer data already exist in the customer_list database
                target_customer.update_reward(int(earned_reward))
        else: # if not, create a new BasicCustomer() object for the new customer
            now_time_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S") #creat timestamp
            new_customer = BasicCustomer(customer_name, None, earned_reward, datetime.datetime.strptime(now_time_str, "%d/%m/%Y %H:%M:%S")) #turn timstamp str into datetime
            self.record.customer_list.append(new_customer)
        print(f"Rewards {earned_reward} are updated!")
        
##------------- Other small function ------------##

def clean_list_blank(input_list):
        '''
        Clean the spare space around items in inputted list
        '''
        for list_item in range(len(input_list)): 
                input_list[list_item] = input_list[list_item].strip()
        return input_list

#------------- Run code -------------# 
home_phar_system = Operations()
customer_file, product_file, order_file = home_phar_system.load_files("customers.txt", "products.txt", "orders.txt")
home_phar_system.menu()
home_phar_system.write_in_files(customer_file, product_file, order_file)

# Documentation:
# The challenge of this assignment is in converting previous content into an object-oriented (OO) structure. 
# The entire structure and concepts have changed, including how to call functions and set variables. 
# This causes that I use so much time at the initial phase of completeing the PASS level. Once I became familiar with it, the second major challenge I encountered was handling datetime. 
# Since I'm not accustomed to this type, I spent a lot of time figuring out how to add the reward from the order when it is first imported and ensuring that the reward is not added again when the program is restarted. 
# The third challenge is that I spent a lot of time to go through python website ot find some function or knowledge that I'm not familiar with, like generator(when use yield), datetime, and etc.
# Most of the remaining time was spent adjusting the layout and ensuring that the data could be updated and saved as expected.
# It was really easy to get lost in the object maze. A object contain B object, and B object contain C object... sometimes will be hard to find which layer generates the error
# Additionally, I did some automatic function, such as transform ID into name, calculate the max width of "product x quantity" in order object, save product.txt in "Product at the top, Bundle at the bottom" format
# Through this assignment, I feel like I'm more close to a real engineer
